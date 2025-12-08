import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";

import { isFeatureEnabled } from "@/lib/features";

export async function POST(req: NextRequest) {
  if (!(await isFeatureEnabled("hub"))) {
    return NextResponse.json(
      { error: "The Hub feature is not enabled on this instance." },
      { status: 403 }
    );
  }

  const authResult = await validateAuth();

  if (!authResult || !authResult.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { agentName } = body;

  if (!agentName) {
    return NextResponse.json({ error: "Missing agentName" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Check ownership
  const isOwner = agent.userId === authResult.user.id;
  // TODO: Check organization ownership if applicable
  // const isOrgMember = agent.organizationId && ... (needs better-auth org check)
  
  // For now, simple ownership check strictly by userID or implicit via org membership logic if extended later.
  // Actually, let's just stick to straight userId check OR if the user is an admin.
  // A robust check would verify if user is member of organizationId.
  
  let hasPermission = isOwner;
  if (!hasPermission && agent.organizationId) {
     // Check basic membership in the org. authResult.session.activeOrganizationId might be one way,
     // but better is to check the Member table.
     const membership = await prisma.member.findFirst({
         where: {
             userId: authResult.user.id,
             organizationId: agent.organizationId
         }
     });
     if (membership) {
         hasPermission = true;
     }
  }

  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedAgent = await prisma.agent.update({
    where: { name: agentName },
    data: {
      verificationStatus: "PENDING",
    },
  });

  return NextResponse.json(updatedAgent);
}
