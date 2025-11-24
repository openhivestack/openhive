import { Prisma } from "@prisma/client";
import { AgentCard } from "@open-hive/sdk";

// Re-export SDK types for convenience and consistency
export type { AgentCard, Skill, AgentRegistry } from "@open-hive/sdk";

// Session type from better-auth
export type UserSession = {
  user: { id: string };
  organization?: { id: string };
  activeOrganizationId?: string;
};

// Prisma Helper Type
export type AgentWithVersionsAndSkills = Prisma.AgentGetPayload<{
  include: {
    versions: {
      orderBy: {
        createdAt: "desc";
      };
      include: {
        skills: true;
        _count: {
          select: {
            metrics: true;
          };
        };
      };
    };
  };
}>;

// Platform Agent extension
export interface Agent extends AgentCard {
  id: string;
  downloads?: number;
  private?: boolean;
  organizationId?: string | null;
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  runtime?: string;
}

export interface RegistryOptions {
  page?: number;
  limit?: number;
}

// Next.js Route Params
export interface AgentParams {
  params: Promise<{ agentName: string }>;
}
