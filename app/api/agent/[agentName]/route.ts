import { NextRequest, NextResponse } from "next/server";
import { handleAgentRequest } from "@/lib/services/agent-gateway";
import { validateAuth } from "@/lib/auth";
import { globalRateLimiter } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;

  const auth = await validateAuth();

  // Rate Limit Guests
  if (!auth?.user) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limit = globalRateLimiter.check(ip, 10); // 10 req/min for metadata checks
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  return handleAgentRequest(req, auth?.user || null, agentName);


}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;

  const auth = await validateAuth();

  // Rate Limit Guests
  if (!auth?.user) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limit = globalRateLimiter.check(ip, 10); // 10 req/min for interactions
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  return handleAgentRequest(req, auth?.user || null, agentName);


}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;

  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleAgentRequest(req, auth.user, agentName, []);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;

  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleAgentRequest(req, auth.user, agentName, []);
}
