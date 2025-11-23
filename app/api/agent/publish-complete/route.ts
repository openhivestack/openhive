import { auth, UserSession } from "@/lib/auth";
import { PrismaRegistry } from "@/lib/prisma.registry";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

async function getRegistry(
  session: UserSession | null
): Promise<PrismaRegistry> {
  return new PrismaRegistry(session);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agent } = await req.json();

  if (!agent || !agent.name || !agent.version) {
    return NextResponse.json(
      { message: "Invalid agent data" },
      { status: 400 }
    );
  }

  // Database logic to create or update the agent version
  const registry = await getRegistry(session);
  const agentRecord = await registry.getAgentModel(agent.name);
  if (!agentRecord) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  let agentVersion = agentRecord.versions.find(
    (v) => v.version === agent.version
  );

  if (agentVersion) {
    // TODO: also update description and url if provided in the agent object
    await registry.updateAgentVersionSkills(agentVersion.id, agent.skills);
  } else {
    // Re-fetch the version after creating it to get the full object
    agentVersion = await registry.createNewAgentVersion(
      agent.name,
      agent.version,
      agent.skills,
      agent.description,
      agent.url,
      agent.protocolVersion,
      agent.capabilities,
      agent.runtime
    );
  }

  if (!agentVersion) {
    return NextResponse.json(
      { message: "Could not create or find agent version." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Agent version ${agent.version} published for ${agent.name}`,
  });
}
