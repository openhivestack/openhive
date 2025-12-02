import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
      Math.min(100, parseInt(searchParams.get("limit") || "20"))
    );
    const skip = (page - 1) * limit;

    const [total, versions] = await Promise.all([
      prisma.agentVersion.count({ where: { agentName } }),
      prisma.agentVersion.findMany({
        where: { agentName },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          version: true,
          createdAt: true,
          installCount: true,
        },
      }),
    ]);

    return NextResponse.json({
      versions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions", details: error.message },
      { status: 500 }
    );
  }
}
