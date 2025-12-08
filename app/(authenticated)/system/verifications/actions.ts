"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function approveAgent(agentId: string) {
  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
      },
    });
    revalidatePath("/system/verifications");
    return { success: true };
  } catch (error) {
    console.error("Failed to approve agent:", error);
    return { success: false, error: "Failed to approve agent" };
  }
}

export async function denyAgent(agentId: string) {
  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        verificationStatus: "REJECTED",
      },
    });
    revalidatePath("/system/verifications");
    return { success: true };
  } catch (error) {
    console.error("Failed to deny agent:", error);
    return { success: false, error: "Failed to deny agent" };
  }
}
