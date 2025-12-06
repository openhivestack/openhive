import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AgentPublicPage } from "@/components/agent-public-page";
import type { AgentDetail } from "@/lib/api-client";

interface Props {
  params: Promise<{
    agentName: string;
  }>;
}

export default async function PublicAgentPage({ params }: Props) {
  const { agentName } = await params;

  const agent = await prisma.agent.findUnique({
    where: {
      name: agentName,
      isPublic: true,
      verificationStatus: "VERIFIED",
    },
    include: {
      user: true,
      organization: true,
      _count: {
        select: { executions: true },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!agent) {
    notFound();
  }

  // Map to AgentDetail
  const latestVersion = agent.versions[0];
  const agentCard = (latestVersion?.agentCard as Record<string, any>) || {};

  const agentDetail: AgentDetail = {
    ...agent,
    creator: agent.user ? {
      name: agent.user.name,
      image: agent.user.image,
      username: agent.user.username,
    } : null,
    user: agent.user ? {
      name: agent.user.name,
      image: agent.user.image,
      username: agent.user.username,
    } : null,
    organization: agent.organization ? {
      name: agent.organization.name,
      logo: agent.organization.logo,
      slug: agent.organization.slug,
    } : null,
    version: agent.latestVersion || latestVersion?.version || "0.0.1",
    latestVersion: agent.latestVersion || latestVersion?.version || "0.0.1",
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),

    status: "UNKNOWN", // Telemetry status not available here without extra call, default to UNKNOWN or fetch if needed
    _count: agent._count,
    // Add any other properties from agentCard if needed for display
    ...agentCard,
  };

  return <AgentPublicPage agent={agentDetail} />;
}
