import { validateAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ agentName: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  const { agentName } = await params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
      include: {
        versions: {
          include: {
            metrics: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }

    if (agent.private) {
      if (!session || session.user.id !== agent.userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    }

    // Aggregate Metrics
    const allMetrics = agent.versions.flatMap((v) => v.metrics);

    // 1. Uptime (Days since creation)
    const createdAt = DateTime.fromJSDate(agent.createdAt);
    const now = DateTime.now();
    const uptimeDays = Math.ceil(now.diff(createdAt, "days").days);

    // 2. Success Rate (Overall)
    const taskMetrics = allMetrics.filter((m) => m.type === "TASK_EXECUTION");
    const totalTasks = taskMetrics.length;
    const successTasks = taskMetrics.filter(
      (m) => m.status === "SUCCESS"
    ).length;
    const successRate =
      totalTasks > 0 ? Math.round((successTasks / totalTasks) * 100) : 0;

    // 3. Avg Latency (Overall)
    // duration is in ms
    const completedTasks = taskMetrics.filter((m) => m.duration !== null);
    const totalDuration = completedTasks.reduce(
      (acc, m) => acc + (m.duration || 0),
      0
    );
    const avgLatency =
      completedTasks.length > 0
        ? Math.round(totalDuration / completedTasks.length)
        : 0;

    // 4. Histogram (Last 24 hours)
    const recentMetrics = taskMetrics.filter((m) => {
      const metricTime = DateTime.fromJSDate(m.createdAt);
      // Check if within last 24 hours
      return metricTime >= now.minus({ hours: 24 });
    });

    const chartData = [];
    // Generate 12 buckets of 2 hours each, ending at current time
    for (let i = 0; i < 12; i++) {
      // Start from the oldest bucket
      // i=0 => oldest (now - 24h to now - 22h)
      // i=11 => newest (now - 2h to now)

      // Let's iterate backwards from now to match the loop structure I used in thought
      // i=0 -> 0-2 hours ago (end time is now)
      // i=11 -> 22-24 hours ago

      const endTime = now.minus({ hours: i * 2 });
      const startTime = endTime.minus({ hours: 2 });

      const count = recentMetrics.filter((m) => {
        const t = DateTime.fromJSDate(m.createdAt);
        return t >= startTime && t < endTime;
      }).length;

      // Unshift to put oldest first in the array
      chartData.unshift({
        name: startTime.toFormat("HH:mm"),
        tasks: count,
      });
    }

    return NextResponse.json({
      uptimeDays,
      successRate,
      avgLatency,
      chartData,
      totalTasks,
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
