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
    const {
      // Identity
      name, description, image, homepage, repository,
      onChainId, onChainRegistry, // EIP-8004
      // Version / Core
      version, runtime, tags,
      // Capabilities
      instructions, prompts, skills, capabilities, tools
    } = agentCard;

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
      include: {
        agent: true
      }
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

    // 4. Upsert Agent (Parent)
    // We still update description/tags on the parent for backward compatibility / search indices
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

    // 5. Upsert Agent Profile (Identity)
    // This is the new mutable home for display metadata.
    await prisma.agentProfile.upsert({
      where: { agentName: name },
      create: {
        agentName: name,
        displayName: name, // Default to slug if no display name provided in card (future field)
        description,
        image,
        tags: tags || [],
        homepage,
        repository,
        onChainId,
        onChainRegistry,
      },
      update: {
        description,
        image,
        tags: tags || [],
        homepage,
        repository,
        onChainId,
        onChainRegistry,
      }
    });

    // 6. Upload to Cloud (Source Only)
    const buffer = Buffer.from(await file.arrayBuffer());
    const sourceUrl = await cloudService.uploadSource(name, version, buffer);

    // 7. Store Version Data (Capabilities)
    const storedCard = {
      ...agentCard,
      sourceUrl,
    };
    delete storedCard.files;

    const versionData = {
      // Core
      version,
      agentName: name,
      // Capabilities
      instructions,
      prompts: prompts || [],
      skills: skills || [],
      capabilities: capabilities || {},
      tools: tools || [],
      // Legacy / Backup
      agentCard: storedCard,
    };

    if (existingVersion && force) {
      await prisma.agentVersion.update({
        where: { id: existingVersion.id },
        data: {
          ...versionData,
          agentCard: storedCard // Ensure typescript is happy with the Json type
        },
      });
    } else {
      await prisma.agentVersion.create({
        data: {
          ...versionData,
          agentCard: storedCard
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
