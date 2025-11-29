import { NextRequest, NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";
import { validateAuth } from "@/lib/auth";
import { PrismaRegistry } from "@/lib/prisma.registry";

interface AgentParams {
  params: Promise<{ agentName: string }>;
}

export async function GET(req: NextRequest, { params }: AgentParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;
  const gatewaySecret = process.env.GATEWAY_SECRET;

  if (!gatewaySecret) {
    console.error("GATEWAY_SECRET is not configured");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  // 1. Resolve Target URL for agent card
  const registry = new PrismaRegistry(session);
  const agent = await registry.getAgentModel(agentName);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const latestVersion = agent.versions.find(
    (v) => v.version === agent.latestVersion
  );

  let targetUrl: string;
  let isDeployed = false;

  // Check if agent is deployed using the flag
  if (latestVersion?.deployed) {
    isDeployed = true;
    const baseUrl = cloudService.getAgentInternalUrl(agentName);
    targetUrl = `${baseUrl}/.well-known/agent-card.json`;
  } else {
    const url = latestVersion?.url || "";
    const baseUrl = url.replace(/\/$/, "");
    targetUrl = `${baseUrl}/.well-known/agent-card.json`;
  }

  console.log(`Fetching agent card from: ${targetUrl}`);

  try {
    const headers = new Headers(req.headers);
    headers.set("x-openhive-gateway-secret", gatewaySecret);
    headers.delete("host");

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch agent card from agent" },
        { status: response.status }
      );
    }

    const card = await response.json();

    if (isDeployed) {
      // Rewrite URL to point to the platform proxy
      // We prefer NEXT_PUBLIC_APP_URL if available to ensure correct public URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const platformAgentUrl = `${appUrl}/api/agent/${agentName}`;
      card.url = platformAgentUrl;
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error(`Proxy error for ${agentName} card:`, error);
    return NextResponse.json(
      { error: "Bad Gateway", details: "Failed to reach agent" },
      { status: 502 }
    );
  }
}
