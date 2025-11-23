import { auth, UserSession } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";

interface RouteParams {
  params: Promise<{ agentName: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;

  try {
    const status = await cloudService.getServiceStatus(agentName);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get agent status";
    return NextResponse.json({ message }, { status: 500 });
  }
}
