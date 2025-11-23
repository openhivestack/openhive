import { NextRequest, NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";
import { auth } from "@/lib/auth"; // Assuming auth lib exists
import { PrismaClient } from "@prisma/client"; // Assuming prisma client exists
import { headers } from "next/headers";
import { AgentParams } from "@/lib/types";

const prisma = new PrismaClient();

// Route: /api/agent/[agentName]/deploy
export async function POST(req: NextRequest, { params }: AgentParams) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentName } = await params;
    const body = await req.json();
    const { version = "latest" } = body;

    // 2. Validation: Check ownership and existence
    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Resolve Version
    let resolvedVersion = version;
    if (version === "latest") {
      if (!agent.latestVersion) {
        return NextResponse.json(
          { error: "No versions published for this agent yet." },
          { status: 400 }
        );
      }
      resolvedVersion = agent.latestVersion;
    }

    // 4. Create ECS Service if Needed
    // This ensures the service exists BEFORE the build finishes and tries to update it,
    // or allows us to handle the initial deployment via API.
    try {
      await cloudService.ensureAgentService(agentName, resolvedVersion);
    } catch (err) {
      console.error("Failed to ensure agent service:", err);
      // We continue with the build even if this fails, as the build might fix it or it might be a transient issue.
      // However, for a new agent, this is critical.
      // Let's decide: Should we fail the deployment request?
      // For now, let's log and proceed, but maybe return a warning.
    }

    // 5. Trigger Build
    // This initiates the CodeBuild process.
    // The agent image will be tagged as: [repo-url]:[agentName]-[version]
    const buildId = await cloudService.triggerAgentBuild(
      agent.userId,
      agentName,
      resolvedVersion
    );

    // 6. Response
    // We return the buildId so the client can poll for status
    return NextResponse.json({
      success: true,
      message: "Deployment initiated (Build phase)",
      buildId,
      agentName,
      version: resolvedVersion,
    });
  } catch (error) {
    console.error("Deployment error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Add a GET to check status of build/deployment?
export async function GET(req: NextRequest, { params }: AgentParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... check build status logic if needed
  return NextResponse.json({ status: "not_implemented_yet" });
}
