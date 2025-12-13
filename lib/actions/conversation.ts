"use server";

import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function publishConversation(conversationId: string) {
  // 1. Validation logic
  // We should ideally check if the requester is the owner.
  // For guests, we don't have a session. Trusted guests implicitly own the conversation ID they possess locally.
  // Ideally, we'd sign the ID or have a token, but for this friction-less MVP, 
  // possessing the ID is "ownership" enough for setting isPublic=true.

  // However, to prevent random id scanning/publishing, maybe strict check?
  // Let's rely on the UUID being un-guessable for now.

  // Future: Check if conversation.userId matches session.user.id OR conversation.userId is null (guest)

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // If user is logged in, verify ownership
  const auth = await validateAuth();
  if (conversation.userId && auth?.user?.id !== conversation.userId) {
    throw new Error("Unauthorized");
  }

  // 2. Update DB
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { isPublic: true },
  });

  return {
    id: updated.id,
    isPublic: updated.isPublic,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${updated.id}`
  };
}
