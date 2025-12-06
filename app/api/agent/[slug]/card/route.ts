import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cloudService } from "@/lib/cloud.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const agentName = slug;
  const auth = await validateAuth();

  // 1. Fetch Agent with Latest Version and Creator info
  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
    include: {
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
  const agentCard = (latestVersion?.agentCard as Record<string, any>) || {};

  // 4. Fetch Runtime Status
  // We only fetch status if the user is the owner, as it might be internal info.
  // However, for a "Card", seeing if an agent is "Live" is often useful publicly.
  // Let's allow it for now.
  let status = "UNKNOWN";
  try {
    status = await cloudService.getAgentStatus(agentName);
  } catch (e) {
    console.warn(`Failed to fetch status for ${agentName}`, e);
  }

  // 5. Construct Response
  const creator = agent.user || (agent.organization ? {
      name: agent.organization.name,
      image: agent.organization.logo,
      username: agent.organization.slug
  } : null);

  const card = {
    // Spread Agent Card Metadata first (so DB fields override if collision occurs, or vice versa?)
    // User asked to "spread anything for the agentCard", usually meaning it enriches the base object.
    ...agentCard,

    // Database Fields (Source of Truth)
    id: agent.id,
    did: agent.did,
    name: agent.name,
    description: agent.description || agentCard.description, // Fallback to card description
    isPublic: agent.isPublic,
    runtime: agent.runtime,
    tags: agent.tags,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,

    // Derived / Relational Info
    creator: creator,
    version: latestVersion?.version || "0.0.0",
    latestVersion: latestVersion?.version || "0.0.0", // Explicit field
    installCount: latestVersion?.installCount || 0,

    // Operational Info
    status,
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
