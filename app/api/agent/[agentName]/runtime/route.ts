import { validateAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ agentName: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  const { agentName } = await params;

  // Only check if agent exists and if user has access
  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  if (agent.private) {
    if (!session || session.user.id !== agent.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const status = await cloudService.getServiceStatus(agentName);

    let runtimeStatus = "STOPPED";

    if (status.status === "NOT_FOUND" || status.status === "INACTIVE") {
      runtimeStatus = "STOPPED";
    } else if (status.status === "ACTIVE") {
      if (status.runningCount > 0) {
        runtimeStatus = "RUNNING";
      } else if (status.desiredCount > 0 && status.runningCount === 0) {
        runtimeStatus = "STARTING";
      } else if (status.desiredCount === 0) {
        runtimeStatus = "STOPPED";
      }
    } else if (status.status === "DRAINING") {
      runtimeStatus = "STOPPING";
    }

    // If there are pending tasks, it might be starting/provisioning
    if (runtimeStatus === "RUNNING" && status.pendingCount > 0) {
      // It's running but scaling? Or replacing?
      // Keep it as RUNNING or maybe "UPDATING"
    }

    return NextResponse.json({ status: runtimeStatus, details: status });
  } catch (error) {
    console.error("Failed to get agent runtime status:", error);
    return NextResponse.json({ status: "UNKNOWN" });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;
  const { action } = await req.json(); // 'start' | 'stop'

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  // Only owner can start/stop
  if (session.user.id !== agent.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    if (action === "start") {
      if (!agent.latestVersion) {
        return NextResponse.json(
          { message: "Cannot start agent without a version" },
          { status: 400 }
        );
      }
      await cloudService.deployAgentService(agentName, agent.latestVersion);
      return NextResponse.json({ message: "Agent starting..." });
    } else if (action === "stop") {
      await cloudService.stopAgentService(agentName);
      return NextResponse.json({ message: "Agent stopping..." });
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Failed to ${action} agent:`, error);
    return NextResponse.json(
      { message: `Failed to ${action} agent` },
      { status: 500 }
    );
  }
}
