import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await validateAuth();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id,
        userId: auth.user.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        agent: {
          select: {
            name: true,
            verificationStatus: true,
            latestVersion: true, // needed to get capabilities potentially
            // We'll need to fetch the agent details separately or simpler here if we just need the name which we have
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to fetch conversation", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await validateAuth();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conversation = await prisma.conversation.delete({
      where: {
        id,
        userId: auth.user.id,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to delete conversation", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
