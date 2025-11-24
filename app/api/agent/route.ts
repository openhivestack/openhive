import { auth, UserSession } from "@/lib/auth";
import { OpenHive } from "@open-hive/sdk";
import { PrismaRegistry } from "@/lib/prisma.registry";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";

async function getRegistry(session: UserSession | null): Promise<OpenHive> {
  const registry = new PrismaRegistry(session);
  return new OpenHive({ registry });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const registry = await getRegistry(session);

  try {
    let agents;
    if (query) {
      agents = await registry.search(query, { page, limit });
    } else {
      agents = await registry.list({ page, limit });
    }

    // Fetch operational status for all agents in bulk
    const agentNames = agents.map((a) => a.name);
    const statuses = await cloudService.getServiceStatuses(agentNames);

    const enrichedAgents = agents.map((agent) => ({
      ...agent,
      status: statuses[agent.name]?.status || "UNKNOWN",
    }));

    return NextResponse.json(enrichedAgents);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve agents";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const agentData = await req.json();
  const registry = await getRegistry(session);

  try {
    const newAgent = await registry.add(agentData);
    return NextResponse.json(newAgent);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add agent";
    return NextResponse.json({ message }, { status: 500 });
  }
}
