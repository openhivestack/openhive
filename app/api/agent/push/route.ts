import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud/service";

import semver from "semver";

export async function POST(req: NextRequest) {
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const metadataJson = formData.get("metadata") as string;
    const file = formData.get("file") as File;
    const force = formData.get("force") === "true";

    if (!metadataJson || !file) {
      return NextResponse.json(
        { error: "Missing metadata or file" },
        { status: 400 }
      );
    }

    const agentCard = JSON.parse(metadataJson);
    const { name, description, version, runtime, tags } = agentCard;

    if (!name || !version) {
      return NextResponse.json(
        { error: "Missing required fields in metadata: name, version" },
        { status: 400 }
      );
    }

    // Validate version format
    if (!semver.valid(version)) {
      return NextResponse.json(
        { error: "Invalid semantic version format" },
        { status: 400 }
      );
    }

    // 1. Check Ownership & Existence
    const existingAgent = await prisma.agent.findUnique({
      where: { name },
    });

    if (existingAgent) {
      if (existingAgent.userId !== auth.user.id) {
        return NextResponse.json(
          { error: "You do not have permission to update this agent" },
          { status: 403 }
        );
      }
    }

    // 2. Check if Version exists
    const existingVersion = await prisma.agentVersion.findUnique({
      where: {
        agentName_version: {
          agentName: name,
          version: version,
        },
      },
    });

    if (existingVersion && !force) {
      return NextResponse.json(
        { error: `Version ${version} already exists for agent ${name}` },
        { status: 409 }
      );
    }

    // 3. Calculate Latest Version
    let latestVersion = version;
    if (existingAgent?.latestVersion) {
      if (semver.gt(existingAgent.latestVersion, version)) {
        latestVersion = existingAgent.latestVersion;
      }
    }

    // 4. Upsert Agent
    const agent = await prisma.agent.upsert({
      where: { name },
      update: {
        description,
        latestVersion,
        runtime,
        tags: tags || [],
      },
      create: {
        did: `hive:agent:${(auth.user as any).username || auth.user.id}:${name}`,
        name,
        description,
        userId: auth.user.id,
        latestVersion: version,
        runtime,
        tags: tags || [],
      },
    });

    // 5. Upload to Cloud (Source Only)
    const buffer = Buffer.from(await file.arrayBuffer());
    const sourceUrl = await cloudService.uploadSource(name, version, buffer);

    // 6. Store Version Data (Without deployment modification)
    const storedCard = {
      ...agentCard,
      sourceUrl,
      // We do NOT modify url here. It remains as defined in the local .agent-card.json
    };
    delete storedCard.files;

    if (existingVersion && force) {
      await prisma.agentVersion.update({
        where: { id: (existingVersion as any).id },
        data: {
          agentCard: storedCard,
          // deploymentUrl was removed
        },
      });
    } else {
      await prisma.agentVersion.create({
        data: {
          version,
          agentName: name,
          agentCard: storedCard,
        },
      });
    }

    return NextResponse.json({ success: true, agent, sourceUrl });
  } catch (error: any) {
    console.error(`[AgentPush] Push error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
