import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud/service";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const agentName = slug;

  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.userId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const envVars = await cloudService.getEnvironmentVariables(agentName);
    return NextResponse.json({ envVars });
  } catch (error: any) {
    console.error(`[AgentConfig] Error fetching environment variables:`, error);
    return NextResponse.json(
      {
        error: "Failed to fetch environment variables",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const agentName = slug;

  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.userId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { envVars } = body;

    if (!envVars || typeof envVars !== "object") {
      return NextResponse.json(
        { error: "Invalid request body. 'envVars' is required." },
        { status: 400 }
      );
    }

    await cloudService.updateEnvironmentVariables(agentName, envVars);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[AgentConfig] Error updating environment variables:`, error);
    return NextResponse.json(
      {
        error: "Failed to update environment variables",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
