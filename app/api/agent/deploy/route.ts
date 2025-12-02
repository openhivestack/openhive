import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud.service";

export async function POST(req: NextRequest) {
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, version } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    // 1. Find Agent
    const agent = await prisma.agent.findUnique({
      where: { name },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1, // We might need specific version later
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== auth.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to deploy this agent" },
        { status: 403 }
      );
    }

    // 2. Determine Version
    let targetVersion = version;
    if (!targetVersion) {
      if (agent.latestVersion) {
        targetVersion = agent.latestVersion;
      } else if (agent.versions.length > 0) {
        targetVersion = agent.versions[0].version;
      } else {
        return NextResponse.json(
          { error: "No versions available to deploy" },
          { status: 400 }
        );
      }
    }

    // 3. Get Version Record
    const versionRecord = await prisma.agentVersion.findUnique({
      where: {
        agentName_version: {
          agentName: name,
          version: targetVersion,
        },
      },
    });

    if (!versionRecord) {
      return NextResponse.json(
        { error: `Version ${targetVersion} not found` },
        { status: 404 }
      );
    }

    const agentCard = versionRecord.agentCard as any;
    const sourceUrl = agentCard.sourceUrl;

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Source URL not found in agent card. Cannot deploy." },
        { status: 400 }
      );
    }

    // 4. Deploy to Cloud
    // This usually triggers a build/deploy process returning the internal service URL
    await cloudService.deployAgent(name, targetVersion, sourceUrl, {});

    // 5. Update AgentVersion
    // We set agentCard.url to the Platform Proxy URL (publicUrl)
    // We do NOT save deploymentUrl in the DB anymore.

    const publicUrl = await cloudService.getAgentUrl(name);

    const updatedCard = {
      ...agentCard,
      url: publicUrl || agentCard.url, // Fallback if publicUrl is null
    };

    await prisma.agentVersion.update({
      where: { id: versionRecord.id },
      data: {
        // deploymentUrl: deploymentUrl, // REMOVED
        agentCard: updatedCard,
      } as any,
    });

    return NextResponse.json({
      success: true,
      deployedUrl: publicUrl,
      // internalUrl: deploymentUrl, // Optional to return, but not stored
    });
  } catch (error: any) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
