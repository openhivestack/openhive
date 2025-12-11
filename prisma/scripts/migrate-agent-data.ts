
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration of Agent data...");

  // 1. Fetch all Agents that don't have a profile yet (or we can just update all to be safe)
  const agents = await prisma.agent.findMany({
    include: {
      versions: {
        orderBy: { createdAt: "desc" }, // Process latest version first if needed
      },
      profile: true,
    },
  });

  console.log(`Found ${agents.length} agents. Processing...`);

  for (const agent of agents) {
    try {
      console.log(`Processing Agent: ${agent.name}`);

      // Determine source of truth for Identity (Profile)
      // Use the latest version's card if available, or fallback to agent record
      const latestVersion = agent.versions[0];
      const agentCard = (latestVersion?.agentCard as any) || {};

      // 2. Upsert AgentProfile
      // We extract Identity fields from the latest agentCard
      const profileData = {
        displayName: agentCard.name || agent.name,
        description: agentCard.description || agent.description,
        image: agentCard.image, // Fallback to User image? No, keep it null if not set.
        tags: agentCard.tags || agent.tags || [],
        homepage: agentCard.homepage,
        repository: agentCard.repository,
        onChainId: agentCard.onChainId,
        onChainRegistry: agentCard.onChainRegistry,
      };

      await prisma.agentProfile.upsert({
        where: { agentName: agent.name },
        create: {
          agentName: agent.name,
          ...profileData,
        },
        update: {
          ...profileData,
        },
      });
      console.log(`  - Upserted Profile`);


      // 3. Update AgentVersions (Capabilities)
      // Iterate through ALL versions and backfill flattened fields from their stored agentCard
      for (const version of agent.versions) {
        const card = (version.agentCard as any) || {};

        // Extract Capability fields
        const capabilitiesData = {
          instructions: card.instructions,
          prompts: card.prompts || [],
          skills: card.skills || [],
          capabilities: card.capabilities || {},
          tools: card.tools || [],
        };

        // Update the version record
        await prisma.agentVersion.update({
          where: { id: version.id },
          data: {
            ...capabilitiesData,
          },
        });
      }
      console.log(`  - Updated ${agent.versions.length} versions with flattened capabilities`);

    } catch (error) {
      console.error(`Failed to process agent ${agent.name}:`, error);
    }
  }

  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
