import { NextRequest } from "next/server";
import { handleAgentRequest } from "@/lib/agent-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
  return handleAgentRequest(req, agentName, []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
  return handleAgentRequest(req, agentName, []);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
  return handleAgentRequest(req, agentName, []);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
  return handleAgentRequest(req, agentName, []);
}
