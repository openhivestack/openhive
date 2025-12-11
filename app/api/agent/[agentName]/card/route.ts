import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;
  const auth = await validateAuth();

  // 1. Fetch Agent with Latest Version, Profile, and Creator info
  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
    include: {
      profile: true, // Fetch Identity
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      user: {
        select: {
          name: true,
          image: true,
          username: true,
        },
      },
      organization: {
        select: {
          name: true,
          logo: true,
          slug: true,
        },
      },
      _count: {
        select: { executions: true },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // 2. Access Control
  // If not public, user must be logged in and be the owner
  if (!agent.isPublic) {
    if (!auth?.user || agent.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 3. Prepare Data
  const latestVersion = agent.versions[0];
  const profile = agent.profile;

  // Fallback to legacy `agentCard` JSON if generic fields are missing (migration safety)
  const legacyCard = (latestVersion?.agentCard as Record<string, any>) || {};

  // 4. Fetch Runtime Status
  let status = "UNKNOWN";
  try {
    status = await cloudService.getAgentStatus(agentName);
  } catch (e) {
    console.warn(`Failed to fetch status for ${agentName}`, e);
  }

  // 5. Construct Response (Merge Identity + Capabilities)
  const creator = agent.user || (agent.organization ? {
    name: agent.organization.name,
    image: agent.organization.logo,
    username: agent.organization.slug
  } : null);

  const card = {
    // Identity (Profile > Agent > Legacy)
    name: profile?.displayName || agent.name,
    description: profile?.description || agent.description || legacyCard.description,
    image: profile?.image || legacyCard.image, // Avatar
    homepage: profile?.homepage || legacyCard.homepage,
    repository: profile?.repository || legacyCard.repository,

    // Core Metadata
    id: agent.id, // DB ID
    did: agent.did,
    tags: profile?.tags?.length ? profile.tags : agent.tags,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    isPublic: agent.isPublic,
    runtime: agent.runtime,
    status,

    // Capabilities (Version > Legacy)
    version: latestVersion?.version || "0.0.0",
    instructions: latestVersion?.instructions || legacyCard.instructions,
    prompts: latestVersion?.prompts || legacyCard.prompts || [],
    skills: latestVersion?.skills || legacyCard.skills || [],
    capabilities: latestVersion?.capabilities || legacyCard.capabilities || {},
    tools: latestVersion?.tools || legacyCard.tools || [],

    // Derived / Relational Info
    creator: creator,
    latestVersion: latestVersion?.version || "0.0.0",
    installCount: latestVersion?.installCount || 0,
    _count: agent._count,
  };

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  // Fallback to 'user' if username is missing (shouldn't happen for valid users)
  const ownerName = agent.user?.username || "unknown";
  const gupri = `${protocol}://${host}/api/agent/${ownerName}/${agentName}`;

  return NextResponse.json({
    "@context": {
      "@vocab": "https://w3id.org/a2a/vocab#",
      "dcat": "http://www.w3.org/ns/dcat#",
      "dcterms": "http://purl.org/dc/terms/",
      "foaf": "http://xmlns.com/foaf/0.1/"
    },
    "@id": gupri,
    "@type": "dcat:Dataset",
    ...card,
  });
}
