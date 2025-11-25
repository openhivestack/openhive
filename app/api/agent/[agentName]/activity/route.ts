import { validateAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ agentName: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  const { agentName } = await params;
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  try {
    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
      include: {
        versions: {
          select: { id: true },
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

    const versionIds = agent.versions.map((v) => v.id);

    // Get total count for pagination
    const total = await prisma.agentVersionMetric.count({
      where: {
        agentVersionId: { in: versionIds },
      },
    });

    const activities = await prisma.agentVersionMetric.findMany({
      where: {
        agentVersionId: { in: versionIds },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
      include: {
        agentVersion: {
          select: { version: true },
        },
      },
    });

    return NextResponse.json({
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
