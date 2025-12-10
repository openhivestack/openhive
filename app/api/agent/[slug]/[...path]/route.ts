import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { handleAgentRequest } from "@/lib/agent-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Assuming structure /api/agent/[slug]/[agentName]/[...subPath]
  // BUT this file is /api/agent/[slug]/[...path]/route.ts
  // So path[0] is agentName, rest is subpath.
  const agentName = path[0];
  const subPath = path.slice(1);

  return handleAgentRequest(req, auth.user, agentName, subPath);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentName = path[0];
  const subPath = path.slice(1);

  return handleAgentRequest(req, auth.user, agentName, subPath);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentName = path[0];
  const subPath = path.slice(1);

  return handleAgentRequest(req, auth.user, agentName, subPath);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentName = path[0];
  const subPath = path.slice(1);

  return handleAgentRequest(req, auth.user, agentName, subPath);
}
