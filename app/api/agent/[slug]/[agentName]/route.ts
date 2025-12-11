import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth";
import { cloudService } from "@/lib/cloud/service";

import { handleAgentRequest } from "@/lib/services/agent-gateway";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; agentName: string }> }
) {
  const { slug, agentName } = await params;

  // If we have a path (e.g. from [...path]), pass it. Here we are at the root.
  // BUT: handleAgentRequest treats GET to root as "return card". 
  // We already implemented custom card logic below.
  // So we keep our custom GET.

  // ... implementation ...

  const owner = slug;
  const auth = await validateAuth();

  // 1. Resolve Owner (User or Organization)
  let ownerId: string | undefined;
  let ownerType: "user" | "org" = "user";

  if (owner === "-") {
    // If slug is "-", we skip owner resolution and find agent by name only (legacy/global behavior)
    // This supports agents that might not have correct owner linkage yet or for backward compatibility
  } else {
    const user = await prisma.user.findUnique({
      where: { username: owner },
    });

    if (user) {
      ownerId = user.id;
      ownerType = "user";
    } else {
      const org = await prisma.organization.findUnique({
        where: { slug: owner },
      });
      if (org) {
        ownerId = org.id;
        ownerType = "org";
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: `Owner '${owner}' not found` },
        { status: 404 }
      );
    }
  }

  // 2. Find Agent belonging to this owner
  const where: any = {
    name: agentName,
  };

  if (ownerId) {
    if (ownerType === "user") {
      where.userId = ownerId;
    } else {
      where.organizationId = ownerId;
    }
  }

  const agent = await prisma.agent.findFirst({
    where,
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
    },
  });

  if (!agent) {
    return NextResponse.json(
      { error: `Agent '${agentName}' not found for owner '${owner}'` },
      { status: 404 }
    );
  }

  // 3. Access Control
  if (!agent.isPublic) {
    if (!auth?.user || agent.userId !== auth.user.id) {
      // TODO: Add org membership check here for private org agents
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 4. Prepare Data (Similar to card route)
  const latestVersion = agent.versions[0];
  const agentCard = (latestVersion?.agentCard as Record<string, any>) || {};

  let status = "UNKNOWN";
  try {
    status = await cloudService.getAgentStatus(agentName);
  } catch (e) {
    // Ignore status errors
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const gupri = `${protocol}://${host}/api/agent/${owner}/${agentName}`;

  const card = {
    "@context": {
      "@vocab": "https://w3id.org/a2a/vocab#",
      "dcat": "http://www.w3.org/ns/dcat#",
      "dcterms": "http://purl.org/dc/terms/",
      "foaf": "http://xmlns.com/foaf/0.1/"
    },
    "@id": gupri,
    "@type": "dcat:Dataset",

    ...agentCard,

    // Force URL to match this proxy, so clients (provider) use the correct endpoint
    url: gupri,

    // Database Fields
    id: agent.id, // Keep internal ID available
    name: agent.name,
    description: agent.description || agentCard.description,
    isPublic: agent.isPublic,
    runtime: agent.runtime,
    tags: agent.tags,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,

    creator: agent.user,
    version: latestVersion?.version || "0.0.0",
    latestVersion: latestVersion?.version || "0.0.0",
    installCount: latestVersion?.installCount || 0,
    status,
  };

  return NextResponse.json(card);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; agentName: string }> }
) {
  const { slug, agentName } = await params;
  const auth = await validateAuth();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleAgentRequest(req, auth.user, agentName, []);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; agentName: string }> }
) {
  const { agentName } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleAgentRequest(req, auth.user, agentName, []);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; agentName: string }> }
) {
  const { agentName } = await params;
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleAgentRequest(req, auth.user, agentName, []);
}
