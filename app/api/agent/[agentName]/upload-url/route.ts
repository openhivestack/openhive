import { UserSession } from "@/lib/auth";
import { validateAuth } from "@/lib/auth";
import { PrismaRegistry } from "@/lib/prisma.registry";
import { NextResponse, NextRequest } from "next/server";
import { AgentParams } from "@/lib/types";
import { cloudService } from "@/lib/cloud.service";

async function getRegistry(
  session: UserSession | null
): Promise<PrismaRegistry> {
  return new PrismaRegistry(session);
}

export async function POST(req: NextRequest, { params }: AgentParams) {
  const authResult = await validateAuth();
  const session = authResult?.session || null;

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName } = await params;
  const { agent, force } = await req.json();

  if (!agent || !agent.name || !agent.version) {
    return NextResponse.json(
      { message: "Invalid agent data" },
      { status: 400 }
    );
  }

  const registry = await getRegistry(session);
  await registry.findOrCreateAgentContainer(agent);
  const agentRecord = await registry.getAgentModel(agentName);

  if (!agentRecord) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  const ownerId = agentRecord.organizationId || agentRecord.userId;
  if (!ownerId) {
    return NextResponse.json(
      { message: "Agent has no owner" },
      { status: 500 }
    );
  }

  const existingVersion = agentRecord.versions.find(
    (v) => v.version === agent.version
  );

  if (existingVersion) {
    if (!force) {
      return NextResponse.json(
        {
          message: `Version ${agent.version} already exists. Use --force to overwrite.`,
        },
        { status: 400 }
      );
    }

    const latestVersion = agentRecord.versions[0];
    if (latestVersion && existingVersion.id !== latestVersion.id) {
      return NextResponse.json(
        {
          message:
            "Cannot overwrite an older version. Only the latest version can be overwritten.",
        },
        { status: 400 }
      );
    }

    const existingKey = cloudService.generateAgentKey(
      ownerId,
      agent.name,
      agent.version
    );

    await cloudService.deleteFile(existingKey);
  }

  const key = cloudService.generateAgentKey(ownerId, agent.name, agent.version);

  try {
    const url = await cloudService.getUploadUrl(key);
    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("Failed to generate pre-signed URL", (error as Error).stack);
    return NextResponse.json(
      { message: "Failed to generate pre-signed URL" },
      { status: 500 }
    );
  }
}
