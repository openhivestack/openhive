import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AgentTask } from "@/lib/cloud/interface";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
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
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "10"))
    );
    const skip = (page - 1) * limit;

    const [total, executions] = await Promise.all([
      prisma.agentExecution.count({ where: { agentName } }),
      prisma.agentExecution.findMany({
        where: { agentName },
        orderBy: { startedAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    const tasks: AgentTask[] = executions.map((ex: any) => ({
      taskId: ex.taskId,
      status: ex.status,
      agentVersion: ex.agentVersion,
      startTime: ex.startedAt.toISOString(),
      endTime: ex.completedAt?.toISOString(),
      durationMs: ex.durationMs || undefined,
      error: ex.error || undefined,
    }));

    return NextResponse.json({
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error(`[TelemetryTasks] Error in tasks route:`, error);
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: error.message },
      { status: 500 }
    );
  }
}

