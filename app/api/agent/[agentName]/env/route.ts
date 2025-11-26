import { NextRequest, NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";
import { validateAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { AgentParams } from "@/lib/types";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: AgentParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  // Only owner can access env vars
  if (session.user.id !== agent.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const envVars = await cloudService.getAgentEnvironment(agentName);
    return NextResponse.json({ env: envVars });
  } catch (error) {
    console.error(`Failed to get env vars for ${agentName}:`, error);
    return NextResponse.json(
      { message: "Failed to get environment variables" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: AgentParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  if (session.user.id !== agent.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { env } = body;

    if (!env || typeof env !== "object") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    await cloudService.updateAgentEnvironment(agentName, env);
    return NextResponse.json({ message: "Environment variables updated" });
  } catch (error) {
    console.error(`Failed to update env vars for ${agentName}:`, error);
    return NextResponse.json(
      { message: "Failed to update environment variables" },
      { status: 500 }
    );
  }
}

