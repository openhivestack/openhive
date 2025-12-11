import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { handleAgentRequest } from "@/lib/services/agent-gateway";

function resolveAgentAndPath(slug: string, path: string[]) {
  let agentName = path[0];
  let subPath = path.slice(1);

  // Heuristic: If path[0] is a system path or a known resource, 
  // assume the slug is the agent name (format: /api/agent/[agentName]/[...path])
  // Otherwise, assume format /api/agent/[owner]/[agentName]/[...path]
  const systemPaths = [".well-known", "tasks", "artifacts", "call"];

  if (systemPaths.includes(agentName)) {
    agentName = slug;
    subPath = path;
  }

  return { agentName, subPath };
}

async function handleRequest(
  req: NextRequest,
  params: Promise<{ agentName: string; path: string[] }>
) {
  const { agentName, path } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Path is already the subpath since we are at /api/agent/[agentName]/[...path]
  return handleAgentRequest(req, auth.user, agentName, path);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string; path: string[] }> }
) {
  return handleRequest(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string; path: string[] }> }
) {
  return handleRequest(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string; path: string[] }> }
) {
  return handleRequest(req, params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string; path: string[] }> }
) {
  return handleRequest(req, params);
}
