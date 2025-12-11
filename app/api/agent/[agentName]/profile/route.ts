import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
    include: {
      profile: true,
      user: {
        select: {
          username: true,
        },
      },
      organization: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const profile = agent.profile;
  const displayName = profile?.displayName || agent.name;
  const description = profile?.description || agent.description;
  const image = profile?.image || "";

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const ownerName =
    agent.user?.username || agent.organization?.slug || "unknown";

  // Construct A2A Endpoint URL
  // Note: We point to the "card" endpoint as the A2A discovery endpoint
  const cardEndpoint = `${protocol}://${host}/api/agent/${agentName}/card`;
  // Alternative if we want to include owner:
  // const cardEndpoint = `${protocol}://${host}/api/agent/${ownerName}/${agentName}/card`;
  // Based on current [slug]/card/route.ts, it seemingly handles just agentName.

  const registrations = [];
  if (profile?.onChainId && profile?.onChainRegistry) {
    registrations.push({
      agentId: profile.onChainId,
      agentRegistry: profile.onChainRegistry,
    });
  }

  const response = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: displayName,
    description: description,
    image: image,
    endpoints: [
      {
        name: "A2A",
        endpoint: cardEndpoint,
        version: "0.3.0",
      },
    ],
    registrations: registrations,
  };

  return NextResponse.json(response);
}
