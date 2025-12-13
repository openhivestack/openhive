import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await validateAuth();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = 20;
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: auth.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      include: {
        agent: {
          select: {
            name: true,
            verificationStatus: true
          }
        },
        // We might want the last message to show a preview if not stored in 'title' yet
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Failed to fetch conversations", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
