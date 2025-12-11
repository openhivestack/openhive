import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud.service";
import { nanoid } from "nanoid";

export async function handleAgentRequest(
  req: NextRequest,
  user: any, // Accepted validated user object
  agentName: string,
  pathSegments: string[] = []
) {

  // 1. Auth is now handled by the caller (route handler) passing 'user' arg
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  // 2. Lookup Agent
  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const latestVersion = agent.versions[0];
  if (!latestVersion) {
    return NextResponse.json(
      { error: "Agent has no versions" },
      { status: 404 }
    );
  }

  // 3. Handle Special Paths
  const joinedPath = pathSegments.join("/");

  // Special Case: GET request to the root (/api/agent/:name) returns the agent card from DB
  // This is used by the CLI and Platform to resolve agent details.
  if (joinedPath === "" && req.method === "GET") {
    return NextResponse.json(latestVersion.agentCard);
  }

  // Special Case: GET request to .well-known/agent-card.json also returns the agent card from DB
  if (joinedPath === ".well-known/agent-card.json") {
    return NextResponse.json(latestVersion.agentCard);
  }

  // 4. Determine Target URL for Proxying
  const agentCard = latestVersion.agentCard as any;
  let targetBaseUrl = agentCard.url;

  // If the agent's public URL points to our platform, it means we are hosting it.
  // We should resolve the internal URL dynamically to avoid DB staleness and proxy loops.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // If appUrl is not set (e.g. server-side without env), we might have issues,
  // but typically it's set or we can infer.
  // However, safely assuming if url includes '/api/agent/' + agentName, it is us.

  const isPlatformHosted =
    targetBaseUrl &&
    ((appUrl && targetBaseUrl.startsWith(appUrl)) ||
      targetBaseUrl.includes(`/api/agent/${agentName}`));

  if (isPlatformHosted) {
    const internalUrl = await cloudService.getInternalAgentUrl(agentName);
    console.log(`[AgentProxy] Internal URL: ${internalUrl}`);
    if (internalUrl) {
      targetBaseUrl = internalUrl;
    }
  }

  if (!targetBaseUrl) {
    return NextResponse.json(
      { error: "Agent is not deployed (no URL found)" },
      { status: 502 }
    );
  }

  // 5. Construct Target URL
  const targetUrl = `${targetBaseUrl.replace(/\/$/, "")}/${joinedPath}${req.nextUrl.search
    }`;

  // 6. Proxy Request
  try {
    const requestHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Skip headers we want to control or exclude
      if (
        key === "host" ||
        key === "connection" ||
        key === "content-length" ||
        key === "transfer-encoding"
      ) {
        return;
      }
      requestHeaders[key] = value;
    });

    // Add Internal Auth Headers
    if (process.env.GATEWAY_SECRET) {
      requestHeaders["x-openhive-gateway-secret"] = process.env.GATEWAY_SECRET;
    }
    requestHeaders["x-openhive-agent-port"] = "4000";
    requestHeaders["X-OpenHive-User-Id"] = user.id;
    requestHeaders["X-OpenHive-User-Email"] = user.email;

    // Attempt to inspect body for Task ID if JSON
    let body: any = req.body;
    let taskId = nanoid();
    const contentType = req.headers.get("content-type") || "";

    if (req.method === "POST" && contentType.includes("application/json")) {
      try {
        // Buffer the body text so we can parse it AND pass it upstream
        const text = await req.text();
        body = text;

        const json = JSON.parse(text);

        if (json?.message?.messageId) {
          taskId = json.message.messageId;
        } else if (json?.taskId) {
          taskId = json.taskId;
        } else if (json?.id) {
          taskId = json.id;
        }
      } catch (e) {
        // Ignore body parse errors, fallback to random ID
        console.warn(`[AgentProxy] Failed to parse JSON body: ${e}`);
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
      body: body,
      // Use a custom 5-minute timeout signal to allow for cold starts,
      // overriding potentially shorter client/request signals.
      signal: AbortSignal.timeout(300000),
      duplex: "half",
    } as any);

    console.log(
      `[AgentProxy] Response from ${targetUrl}: ${response.status} ${response.statusText}`
    );

    // If JSON, let's peek at it for debugging purposes if it's not a stream
    const responseContentType = response.headers.get("content-type") || "";

    if (
      responseContentType.includes("application/json") &&
      !responseContentType.includes("text/event-stream")
    ) {
      try {
        const clone = response.clone();
        const text = await clone.text();
      } catch (_) {
        console.log("[AgentProxy] Could not read response body preview.");
      }
    }

    // 7. Return Response & Log Metrics
    const responseHeaders = new Headers(response.headers);

    // Clean up headers that interfere with Next.js / Proxying
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");

    // Ensure SSE headers are correct if applicable
    if (
      responseContentType.includes("text/event-stream") ||
      requestHeaders["accept"] === "text/event-stream"
    ) {
      if (responseContentType.includes("text/event-stream")) {
        responseHeaders.set("Cache-Control", "no-cache, no-transform");
        responseHeaders.set("Connection", "keep-alive");
        responseHeaders.set("X-Accel-Buffering", "no"); // Prevent buffering by Nginx/proxies
      }
    }

    const durationMs = Date.now() - start;
    const status = response.ok ? "completed" : "failed";
    const error = response.ok
      ? undefined
      : `HTTP ${response.status}: ${response.statusText}`;

    // Log execution asynchronously
    // Note: In serverless environments (Vercel), you should use waitUntil if available.
    // Here we await it to ensure visibility, as the latency impact is minimal.
    try {
      await prisma.agentExecution.create({
        data: {
          agentName,
          taskId: taskId.toString(),
          agentVersion: latestVersion.version,
          status,
          startedAt: new Date(start),
          completedAt: new Date(),
          durationMs,
          error,
        },
      });
    } catch (logError) {
      console.error("[AgentProxy] Failed to log agent execution:", String(logError));
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[AgentProxy] Proxy error to ${targetUrl}:`, String(error));
    return NextResponse.json(
      { error: "Failed to contact agent", details: error.message },
      { status: 502 }
    );
  }
}
