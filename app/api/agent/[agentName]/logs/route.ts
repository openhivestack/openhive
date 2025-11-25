import { validateAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";

interface RouteParams {
  params: Promise<{ agentName: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;

  try {
    const logs = await cloudService.getAgentLogs(agentName);
    return NextResponse.json({ logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get agent logs";
    return NextResponse.json({ message }, { status: 500 });
  }
}
