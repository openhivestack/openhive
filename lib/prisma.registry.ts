import { PrismaClient, Prisma } from "@prisma/client";
import { AgentCard, AgentRegistry, Skill, QueryParser } from "@open-hive/sdk";
import {
  UserSession,
  AgentWithVersionsAndSkills,
  Agent,
  RegistryOptions,
} from "./types";
import { generateDid } from "./utils";
import { config } from "./config";

const prisma = new PrismaClient();

const agentWithVersionsAndSkills = Prisma.validator<Prisma.AgentDefaultArgs>()({
  include: {
    versions: {
      orderBy: { createdAt: "desc" },
      include: {
        skills: true,
        _count: { select: { metrics: true } },
      },
    },
  },
});

export class PrismaRegistry implements AgentRegistry {
  public name = "PrismaRegistry";
  private session: UserSession | null;
  private queryParser = new QueryParser();

  constructor(session: UserSession | null) {
    this.session = session;
  }

  private toAgentCard(agent: AgentWithVersionsAndSkills): Agent {
    const latestVersion = agent.versions[0];
    if (!latestVersion) {
      throw new Error(`Agent ${agent.name} has no versions.`);
    }

    // Calculate total downloads
    const downloads = agent.versions.reduce(
      (acc, v) => acc + (v.downloadCount || 0),
      0
    );

    return {
      id: agent.id,
      name: agent.name,
      description: latestVersion.description ?? "",
      protocolVersion: latestVersion.protocolVersion ?? "0.3.0",
      version: latestVersion.version,
      url: latestVersion.url || `/api/agents/${agent.name}`,
      private: agent.private,
      downloads,
      organizationId: agent.organizationId,
      userId: agent.userId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      runtime: latestVersion.runtime || "unknown",
      capabilities: (latestVersion.capabilities as any) || {},
      skills: latestVersion.skills.map((skill: any) => ({
        id: skill.skillId,
        name: skill.name || skill.skillId,
        description: skill.description ?? "",
        tags: skill.tags,
        input: (skill.input as Record<string, unknown>) || {},
        output: (skill.output as Record<string, unknown>) || {},
      })),
    };
  }

  async add(agentData: AgentCard & { runtime: string }): Promise<Agent> {
    if (!this.session) throw new Error("Unauthorized");
    const {
      name,
      description,
      version,
      skills,
      url,
      protocolVersion,
      capabilities,
      runtime,
    } = agentData;

    const agent = await prisma.agent.create({
      data: {
        id: generateDid(config.registryDidPrefix, config.registryDidClassification),
        name,
        userId: this.session.user.id,
        runtime: runtime || "unknown",
        latestVersion: version,
        versions: {
          create: {
            version,
            description,
            url: url || "",
            tags: ["latest"],
            protocolVersion: protocolVersion || "0.3.0",
            capabilities: (capabilities as Prisma.JsonObject) || {},
            runtime: runtime || "unknown",
            skills: {
              create: skills.map((s: Skill) => ({
                skillId: s.id,
                name: s.name,
                description: s.description || s.name,
                tags: s.tags || [],
                input: (s.input as Prisma.JsonObject) || {},
                output: (s.output as Prisma.JsonObject) || {},
              })),
            },
          },
        },
      },
      include: agentWithVersionsAndSkills.include,
    });
    return this.toAgentCard(agent);
  }

  async get(agentName: string): Promise<Agent | null> {
    const where: Prisma.AgentWhereInput = { name: agentName };
    if (this.session) {
      where.OR = [{ userId: this.session.user.id }, { private: false }];
    } else {
      where.private = false;
    }

    const agent = await prisma.agent.findFirst({
      where,
      include: agentWithVersionsAndSkills.include,
    });

    return agent ? this.toAgentCard(agent) : null;
  }

  async list(options?: RegistryOptions): Promise<Agent[]> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const where: Prisma.AgentWhereInput = {};
    if (this.session) {
      where.OR = [{ userId: this.session.user.id }, { private: false }];
    } else {
      where.private = false;
    }
    const agents = await prisma.agent.findMany({
      where,
      include: agentWithVersionsAndSkills.include,
      skip,
      take: limit,
    });
    return agents
      .map((agent) => {
        try {
          return this.toAgentCard(agent);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is Agent => entry !== null);
  }

  async search(query: string, options?: RegistryOptions): Promise<Agent[]> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const parsed = this.queryParser.parse(query);
    const where: Prisma.AgentWhereInput = { AND: [] };

    // Handle general text search (name or description)
    // Since description is now on AgentVersion, we need to search within versions
    parsed.generalFilters.forEach((filter) => {
      (where.AND as Prisma.AgentWhereInput[]).push({
        OR: [
          { name: { contains: filter.term, mode: "insensitive" } },
          {
            versions: {
              some: {
                description: { contains: filter.term, mode: "insensitive" },
              },
            },
          },
        ],
      });
    });

    // Handle field-specific filters
    parsed.fieldFilters.forEach((filter) => {
      if (filter.field === "skills" || filter.operator === "has_skill") {
        (where.AND as Prisma.AgentWhereInput[]).push({
          versions: {
            some: {
              skills: {
                some: {
                  OR: [
                    { name: { contains: filter.value, mode: "insensitive" } },
                    {
                      skillId: { contains: filter.value, mode: "insensitive" },
                    },
                  ],
                },
              },
            },
          },
        });
      } else if (filter.field === "is" && filter.value === "private") {
        (where.AND as Prisma.AgentWhereInput[]).push({ private: true });
      } else if (filter.field === "is" && filter.value === "public") {
        (where.AND as Prisma.AgentWhereInput[]).push({ private: false });
      } else if (filter.field === "name") {
        (where.AND as Prisma.AgentWhereInput[]).push({
          name: { contains: filter.value, mode: "insensitive" },
        });
      }
    });

    if (this.session) {
      (where.AND as Prisma.AgentWhereInput[]).push({
        OR: [{ userId: this.session.user.id }, { private: false }],
      });
    } else {
      (where.AND as Prisma.AgentWhereInput[]).push({ private: false });
    }

    const agents = await prisma.agent.findMany({
      where,
      include: agentWithVersionsAndSkills.include,
      skip,
      take: limit,
    });

    return agents.map((agent) => this.toAgentCard(agent));
  }

  async delete(agentName: string): Promise<void> {
    if (!this.session) throw new Error("Unauthorized");

    const agent = await prisma.agent.findFirst({
      where: { name: agentName, userId: this.session.user.id },
      include: { versions: true },
    });

    if (!agent) {
      throw new Error(
        "Agent not found or you do not have permission to delete it."
      );
    }

    const versionIds = agent.versions.map((v) => v.id);
    if (versionIds.length > 0) {
      await prisma.agentSkill.deleteMany({
        where: { agentVersionId: { in: versionIds } },
      });
      await prisma.agentVersion.deleteMany({
        where: { id: { in: versionIds } },
      });
    }
    await prisma.agent.delete({ where: { name: agentName } });
  }

  async update(
    agentName: string,
    agentData: Partial<AgentCard>
  ): Promise<Agent> {
    if (!this.session) throw new Error("Unauthorized");

    const agent = await prisma.agent.findFirst({
      where: { name: agentName, userId: this.session.user.id },
      include: { versions: true }, // Explicitly include versions
    });
    if (!agent) {
      throw new Error(
        "Agent not found or you do not have permission to update it."
      );
    }

    const { name, description } = agentData;

    // Update description on latest version if it exists
    const latestVersion = agent.versions && agent.versions[0];
    if (latestVersion && description) {
      await prisma.agentVersion.update({
        where: { id: latestVersion.id },
        data: { description },
      });
    }

    const updatedAgent = await prisma.agent.update({
      where: { name: agentName },
      data: { name },
      include: agentWithVersionsAndSkills.include,
    });
    return this.toAgentCard(updatedAgent);
  }

  async clear(): Promise<void> {
    // This is a dangerous operation, so we'll restrict it.
    // In a real app, you'd have more robust checks.
    if (this.session?.user.id !== "SUPER_ADMIN_ID") {
      throw new Error("Unauthorized to clear the entire registry.");
    }
    await prisma.agentSkill.deleteMany({});
    await prisma.agentVersion.deleteMany({});
    await prisma.agent.deleteMany({});
  }

  async close(): Promise<void> {
    await prisma.$disconnect();
  }

  // --- OpenHive Platform-specific methods ---

  public async findOrCreateAgentContainer(agentData: AgentCard): Promise<void> {
    if (!this.session) throw new Error("Unauthorized");
    const { name } = agentData;
    const { user } = this.session;

    // We can't easily upsert description/url onto the "latest" version here without knowing which version that is.
    // This method seems to be for initial container setup.
    // We'll upsert the Agent record itself, but Agent no longer has description/endpoint.

    await prisma.agent.upsert({
      where: { name },
      create: {
        id: generateDid(config.registryDidPrefix, config.registryDidClassification),
        name,
        userId: user.id,
        runtime: "unknown",
        latestVersion: "0.0.0", // Placeholder, will be updated when version is created
      },
      update: {}, // No top-level fields to update besides maybe name/userId which we shouldn't touch here
    });
  }

  public async createNewAgentVersion(
    agentName: string,
    version: string,
    skills: Skill[],
    description?: string,
    url?: string,
    protocolVersion?: string,
    capabilities?: Record<string, unknown>,
    runtime?: string
  ): Promise<
    Prisma.AgentGetPayload<
      typeof agentWithVersionsAndSkills
    >["versions"][number]
  > {
    const agent = await this.getAgentModel(agentName);

    if (!agent) throw new Error("Agent not found");

    return prisma.$transaction(async (tx) => {
      // Step 1: Find and untag the current 'latest' version
      const currentLatest = await tx.agentVersion.findFirst({
        where: { agentId: agent.id, tags: { has: "latest" } },
      });

      if (currentLatest) {
        await tx.agentVersion.update({
          where: { id: currentLatest.id },
          data: {
            tags: { set: currentLatest.tags.filter((t) => t !== "latest") },
          },
        });
      }

      // Step 2: Create the new version and tag it as 'latest'
      const newVersion = await tx.agentVersion.create({
        data: {
          agentId: agent.id,
          version,
          description,
          url: url || "",
          tags: ["latest"],
          protocolVersion: protocolVersion || "0.3.0",
          capabilities: (capabilities as Prisma.JsonObject) || {},
          runtime: runtime || "unknown",
          skills: {
            create: skills.map((s) => ({
              skillId: s.id,
              name: s.name,
              description: s.description || s.name,
              tags: s.tags || [],
              input: (s.input as Prisma.JsonObject) || {},
              output: (s.output as Prisma.JsonObject) || {},
            })),
          },
        },
        include: {
          skills: true,
          _count: { select: { metrics: true } },
        },
      });

      // Step 3: Update the agent's latestVersion field
      await tx.agent.update({
        where: { id: agent.id },
        data: { latestVersion: version },
      });

      return newVersion;
    });
  }

  public async updateAgentVersionSkills(
    versionId: string,
    skills: Skill[]
  ): Promise<void> {
    await prisma.agentSkill.deleteMany({
      where: { agentVersionId: versionId },
    });
    if (skills && skills.length > 0) {
      await prisma.agentSkill.createMany({
        data: skills.map((s) => ({
          agentVersionId: versionId,
          skillId: s.id,
          name: s.name,
          description: s.description || s.name,
          tags: s.tags || [],
          input: (s.input as Prisma.JsonObject) || {},
          output: (s.output as Prisma.JsonObject) || {},
        })),
      });
    }
  }

  public async getAgentModel(
    agentName: string
  ): Promise<AgentWithVersionsAndSkills | null> {
    if (!this.session) throw new Error("Unauthorized");

    const agent = await prisma.agent.findFirst({
      where: { name: agentName },
      include: agentWithVersionsAndSkills.include,
    });

    if (agent && agent.private && agent.userId !== this.session.user.id) {
      throw new Error("You do not have permission to view this agent.");
    }
    return agent;
  }
}
