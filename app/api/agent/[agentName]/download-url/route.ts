import { validateAuth, UserSession } from "@/lib/auth";
import { PrismaRegistry } from "@/lib/prisma.registry";
import { NextRequest, NextResponse } from "next/server";
import { AgentParams } from "@/lib/types";
import { cloudService } from "@/lib/cloud.service";
import { incrementDownloadCount, recordMetric } from "@/lib/metrics";

async function getRegistry(
  session: UserSession | null
): Promise<PrismaRegistry> {
  return new PrismaRegistry(session);
}

export async function GET(req: NextRequest, { params }: AgentParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { agentName } = await params;
  const versionOrTag = searchParams.get("versionOrTag") || "latest";

  const registry = await getRegistry(session);

  try {
    const agent = await registry.getAgentModel(agentName);
    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }
    const agentVersion = agent.versions.find(
      (v: any) => v.tags.includes(versionOrTag) || v.version === versionOrTag
    );

    if (!agentVersion) {
      return NextResponse.json(
        {
          message: `Version/tag "${versionOrTag}" not found for agent "${agentName}"`,
        },
        { status: 404 }
      );
    }

    const ownerId = agent.organizationId || agent.userId;
    if (!ownerId) {
      return NextResponse.json(
        { message: "Agent has no owner" },
        { status: 500 }
      );
    }

    const key = cloudService.generateAgentKey(
      ownerId,
      agentName,
      agentVersion.version
    );

    const url = await cloudService.getDownloadUrl(key, 300); // 5 minutes

    const userAgent = req.headers.get("user-agent") || "unknown";
    const context = userAgent.startsWith("hive-cli")
      ? { source: "cli" }
      : { source: "unknown" };

    await Promise.all([
      incrementDownloadCount(agentVersion.id),
      recordMetric({
        agentVersionId: agentVersion.id,
        type: "DOWNLOAD",
        status: "SUCCESS",
        userId: session.user.id,
        userAgent,
        context,
      }),
    ]);

    return NextResponse.json({
      url,
      name: agent.name,
      version: agentVersion.version,
      tags: agentVersion.tags,
    });
  } catch (error) {
    console.error("Failed to generate download URL", (error as Error).stack);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate download URL";
    return NextResponse.json({ message }, { status: 500 });
  }
}
