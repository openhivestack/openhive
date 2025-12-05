import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";
import { cloudService } from "@/lib/cloud.service";

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

  try {
    const body = await req.json();
    const { status } = body;

    if (status !== "running" && status !== "stopped") {
      return NextResponse.json(
        { error: "Invalid status. Must be 'running' or 'stopped'." },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Authorization Check
    let isAuthorized = false;

    if (agent.userId === auth.user.id) {
      isAuthorized = true;
    } else if (agent.organizationId) {
      // Check if user is a member of the organization
      const member = await prisma.member.findFirst({
        where: {
          organizationId: agent.organizationId,
          userId: auth.user.id,
        },
      });
      if (member) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "You do not have permission to manage this agent." },
        { status: 403 }
      );
    }

    // Perform Action
    if (status === "running") {
      await cloudService.startAgent(agent.name);
    } else {
      await cloudService.stopAgent(agent.name);
    }

    // Return updated status (optimistic or fetched)
    // We can just return the requested status to confirm receipt,
    // or call getAgentStatus. Calling getAgentStatus might be slow.
    // Let's return a success message.
    return NextResponse.json({
      success: true,
      status,
      message: `Agent ${agentName} is being ${
        status === "running" ? "started" : "stopped"
      }.`,
    });
  } catch (error) {
    console.error("Toggle agent failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
