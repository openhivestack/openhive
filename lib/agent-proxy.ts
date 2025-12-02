import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud.service";
import { nanoid } from "nanoid";

export async function handleAgentRequest(
  req: NextRequest,
  agentName: string,
  pathSegments: string[] = []
) {
  // 1. Validate Auth (API Key or Session)
  const auth = await validateAuth();
  if (!auth?.user) {
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
    console.log(`[Agent Proxy] Internal URL: ${internalUrl}`);
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
  const targetUrl = `${targetBaseUrl.replace(/\/$/, "")}/${joinedPath}${
    req.nextUrl.search
  }`;

  // 6. Proxy Request
  try {
    const headers = new Headers(req.headers);

    // Strip host to avoid TLS issues
    headers.delete("host");

    // Add Internal Auth Header required by the Gateway Service
    if (process.env.GATEWAY_SECRET) {
      headers.set("x-openhive-gateway-secret", process.env.GATEWAY_SECRET);
    }

    // Send the agent port to the Gateway (if applicable)
    // This allows the Gateway to dynamically route to the correct internal port
    headers.set("x-openhive-agent-port", "4000");

    // Forward User Context
    headers.set("X-OpenHive-User-Id", auth.user.id);
    headers.set("X-OpenHive-User-Email", auth.user.email);

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
        console.warn("[Agent Proxy] Failed to parse JSON body:", e);
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body,
      signal: req.signal,
      duplex: "half",
    } as any);

    // 7. Return Response & Log Metrics
    const responseHeaders = new Headers(response.headers);

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
      console.error("Failed to log agent execution:", logError);
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`Proxy error to ${targetUrl}:`, error);
    return NextResponse.json(
      { error: "Failed to contact agent", details: error.message },
      { status: 502 }
    );
  }
}
