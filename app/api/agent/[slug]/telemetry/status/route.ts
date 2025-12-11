import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud.service";

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
    const status = await cloudService.getAgentStatus(agentName);
    return NextResponse.json({ status });
  } catch (error: any) {
    console.error(`[TelemetryStatus] Error in status route:`, error);
    return NextResponse.json(
      { error: "Failed to fetch status", details: error.message },
      { status: 500 }
    );
  }
}
