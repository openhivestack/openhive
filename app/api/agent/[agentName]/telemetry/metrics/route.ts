import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DateTime } from "luxon";

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
    const range = searchParams.get("range") || "24h";

    const now = DateTime.now();
    let startTime = now.minus({ hours: 24 });

    if (range === "7d") {
      startTime = now.minus({ days: 7 });
    } else if (range === "30d") {
      startTime = now.minus({ days: 30 });
    } else if (range === "1h") {
      startTime = now.minus({ hours: 1 });
    }

    // Aggregate Metrics
    // 1. Total Executions & Success Rate
    const totalExecutions = await prisma.agentExecution.count({
      where: {
        agentName,
        startedAt: { gte: startTime.toJSDate() },
      },
    });

    const failedExecutions = await prisma.agentExecution.count({
      where: {
        agentName,
        startedAt: { gte: startTime.toJSDate() },
        status: "failed",
      },
    });

    // 2. Average Duration
    const avgDurationAgg = await prisma.agentExecution.aggregate({
      where: {
        agentName,
        startedAt: { gte: startTime.toJSDate() },
        status: "completed",
      },
      _avg: {
        durationMs: true,
      },
    });

    // 3. Time Series (Histogram)
    // Group by interval (e.g. hour or day depending on range)
    // Prisma doesn't support group by date_trunc directly easily without raw query.
    // We'll fetch minimal data and aggregate in memory or use raw query.
    // For simplicity in this iteration, let's fetch id, status, startedAt and aggregate in JS.
    // Ideally use a raw query for performance on large datasets.

    const executions = await prisma.agentExecution.findMany({
      where: {
        agentName,
        startedAt: { gte: startTime.toJSDate() },
      },
      select: {
        startedAt: true,
        status: true,
        durationMs: true,
      },
      orderBy: { startedAt: "asc" },
    });

    // Bucket Size
    // We will use a simplified bucketing strategy for now.
    // let bucketFormat = 'HH:00'; // Hourly
    // if (range === '1h') bucketFormat = 'mm'; // Minute
    // if (range === '30d') bucketFormat = 'dd'; // Daily

    const buckets: Record<string, { count: number; error: number }> = {};

    executions.forEach((ex: any) => {
      const dt = DateTime.fromJSDate(ex.startedAt);
      let key: string | null = null;

      if (range === "30d") {
        // Daily buckets
        key = dt.startOf("day").toISO();
      } else {
        // Minute buckets (default for 24h, 1h, 7d per original logic)
        key = dt.startOf("minute").toISO();
      }

      if (key) {
        if (!buckets[key]) buckets[key] = { count: 0, error: 0 };
        buckets[key].count++;
        if (ex.status === "failed") buckets[key].error++;
      }
    });

    const timeSeries = Object.entries(buckets)
      .map(([timestamp, data]) => ({
        timestamp,
        value: data.count,
        errorCount: data.error,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const metrics = {
      totalExecutions,
      successRate:
        totalExecutions > 0
          ? ((totalExecutions - failedExecutions) / totalExecutions) * 100
          : 0,
      avgDurationMs: avgDurationAgg._avg.durationMs || 0,
      errorCount: failedExecutions,
      timeSeries,
    };

    return NextResponse.json({ metrics });
  } catch (error: any) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics", details: error.message },
      { status: 500 }
    );
  }
}
