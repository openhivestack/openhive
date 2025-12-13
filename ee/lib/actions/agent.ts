"use server";

import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateAgentVisibility(agentName: string, isPublic: boolean) {
  const auth = await validateAuth();
  if (!auth?.session || !auth.user) {
    throw new Error("Unauthorized");
  }

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
    include: {
      organization: true,
    }
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  // Check Permissions: Agent Owner OR Org Admin/Owner
  const isOwner = agent.userId === auth.user.id;

  let isOrgAdmin = false;
  if (agent.organizationId) {
    // If agent belongs to org, check if current user is admin/owner of that org
    const member = await prisma.member.findFirst({
      where: {
        organizationId: agent.organizationId,
        userId: auth.user.id
      }
    });
    if (member && (member.role === 'admin' || member.role === 'owner')) {
      isOrgAdmin = true;
    }
  }

  if (!isOwner && !isOrgAdmin) {
    throw new Error("Forbidden: You do not have permission to manage this agent.");
  }

  // Business Logic: Private Agents require Pro Subscription
  if (!isPublic) {
    let checkId = agent.organizationId;
    let context = "Organization";

    if (!checkId) {
      // Fallback to User Subscription
      if (!agent.userId) {
        // Should not happen for active agents, but safe guard
        throw new Error("System Error: Agent has no owner to check subscription against.");
      }
      checkId = agent.userId;
      context = "Personal";
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        referenceId: checkId,
        status: 'active'
      }
    });

    if (!subscription) {
      throw new Error(`Upgrade Required: Private agents are available on the ${context} Pro plan.`);
    }
  }

  await prisma.agent.update({
    where: { name: agentName },
    data: { isPublic },
  });

  revalidatePath(`/agent/${agentName}`);
  revalidatePath(`/agent/${agentName}/settings`);
  revalidatePath(`/hub`);

  return { success: true };
}
