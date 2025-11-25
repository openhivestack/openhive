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

  try {
    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            version: true,
            createdAt: true,
            description: true,
            downloadCount: true,
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

    return NextResponse.json({
      versions: agent.versions,
    });
  } catch (error) {
    console.error("Failed to fetch versions:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
