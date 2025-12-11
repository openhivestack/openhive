import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";

import { isFeatureEnabled } from "@/lib/features";
import { isRootUser } from "@/lib/auth/utils";

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

  // Root Check
  if (!isRootUser(authResult.user)) {
    return NextResponse.json({ error: "Forbidden: Root access only" }, { status: 403 });
  }

  const body = await req.json();
  const { agentName, status } = body;

  if (!agentName || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["VERIFIED", "REJECTED", "UNVERIFIED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updatedAgent = await prisma.agent.update({
    where: { name: agentName },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
    },
  });

  return NextResponse.json(updatedAgent);
}
