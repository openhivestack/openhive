import { auth, UserSession } from "@/lib/auth";
import { OpenHive } from "@open-hive/sdk";
import { PrismaRegistry } from "@/lib/prisma.registry";
import { AgentParams } from "@/lib/types";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { cloudService } from "@/lib/cloud.service";

async function getRegistry(session: UserSession | null): Promise<OpenHive> {
  const registry = new PrismaRegistry(session);
  return new OpenHive({ registry });
}

export async function GET(req: Request, { params }: AgentParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { agentName } = await params;
  const registry = await getRegistry(session);

  try {
    const agent = await registry.get(agentName);
    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }

    // Fetch operational status from ECS
    let status = "UNKNOWN";
    try {
      const serviceStatus = await cloudService.getServiceStatus(agentName);
      if (serviceStatus.status === "ACTIVE") {
        status = "RUNNING";
      } else if (serviceStatus.status === "NOT_FOUND") {
        status = "STOPPED";
      } else {
        status = serviceStatus.status || "UNKNOWN";
      }
    } catch (error) {
      console.error(`Failed to fetch status for ${agentName}:`, error);
    }

    return NextResponse.json({ ...agent, status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get agent";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: AgentParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;
  const agentData = await req.json();

  const registry = await getRegistry(session);

  try {
    const updatedAgent = await registry.update(agentName, agentData);
    return NextResponse.json(updatedAgent);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update agent";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: AgentParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;
  const registry = await getRegistry(session);

  try {
    await registry.delete(agentName);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove agent";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { recordMetric } from "@/lib/metrics";

// Handle POST requests by proxying to the agent
// This supports agents that accept POST requests at the root path
export async function POST(req: NextRequest, { params }: AgentParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;
  const gatewaySecret = process.env.GATEWAY_SECRET;

  if (!gatewaySecret) {
    console.error("GATEWAY_SECRET is not configured");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  const baseUrl = cloudService.getAgentInternalUrl(agentName);
  const targetUrl = `${baseUrl}/`; // Proxy to agent root

  console.log(`Proxying root POST request to: ${targetUrl}`);

  const startTime = Date.now();
  const prismaRegistry = new PrismaRegistry(session);

  // Start DB lookup in parallel with request setup
  const agentVersionIdPromise = prismaRegistry
    .getAgentModel(agentName)
    .then((agent) => {
      if (agent) {
        const v = agent.versions.find((v) => v.version === agent.latestVersion);
        return v?.id;
      }
      return undefined;
    })
    .catch((err) => {
      console.error("Failed to resolve agent version for metrics:", err);
      return undefined;
    });

  try {
    const headers = new Headers(req.headers);
    headers.set("x-openhive-gateway-secret", gatewaySecret);
    headers.delete("host");

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: req.body,
      // @ts-expect-error - duplex is required for streaming bodies in Node/Edge
      duplex: "half",
    });

    const duration = Date.now() - startTime;
    const status = response.ok ? "SUCCESS" : "FAILURE";

    // Fire and forget metric recording
    agentVersionIdPromise.then((agentVersionId) => {
      if (agentVersionId) {
        recordMetric({
          agentVersionId,
          type: "TASK_EXECUTION",
          status,
          duration,
          userId: session.user.id,
          userAgent: req.headers.get("user-agent") || undefined,
        }).catch((e) => console.error("Metric recording failed:", e));
      }
    });

    const responseHeaders = new Headers(response.headers);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error for ${agentName} (root POST):`, error);

    // Record failure metric
    const duration = Date.now() - startTime;
    agentVersionIdPromise.then((agentVersionId) => {
      if (agentVersionId) {
        recordMetric({
          agentVersionId,
          type: "TASK_EXECUTION",
          status: "FAILURE",
          duration,
          userId: session.user.id,
          userAgent: req.headers.get("user-agent") || undefined,
        }).catch((e) => console.error("Metric recording failed:", e));
      }
    });

    return NextResponse.json(
      { error: "Bad Gateway", details: "Failed to reach agent" },
      { status: 502 }
    );
  }
}
