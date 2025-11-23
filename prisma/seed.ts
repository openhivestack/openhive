import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Using constants for predictable identifiers
const SEED_ORG_SLUG = "seeded-organization-for-local-testing";
const SEED_AGENT_IDS = [
  "seeded-web-analyzer",
  "seeded-image-processor",
  "seeded-data-scraper",
  "seeded-code-formatter",
  "seeded-sentiment-analyzer",
];

async function main() {
  console.log(`Start seeding ...`);

  // 1. Get the first user
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log("No user found in the database. Please create a user first.");
    return;
  }
  console.log(`Found user: ${user.name} (${user.email})`);

  // 2. Cleanup previous seed data
  console.log("Cleaning up previous seed data...");
  await prisma
    .$transaction(async (tx) => {
      // Agent and its children
      const agents = await tx.agent.findMany({
        where: { agentId: { in: SEED_AGENT_IDS } },
        include: { versions: true },
      });

      if (agents.length > 0) {
        for (const agent of agents) {
          const versionIds = agent.versions.map((v) => v.id);
          if (versionIds.length > 0) {
            await tx.agentCapability.deleteMany({
              where: { agentVersionId: { in: versionIds } },
            });
            await tx.agentVersion.deleteMany({
              where: { id: { in: versionIds } },
            });
          }
        }
        await tx.agent.deleteMany({
          where: { agentId: { in: SEED_AGENT_IDS } },
        });
        console.log(`  - Deleted agents and their versions/capabilities.`);
      }

      // Organization and its children
      const organization = await tx.organization.findUnique({
        where: { slug: SEED_ORG_SLUG },
      });
      if (organization) {
        // Members are deleted via cascade from organization
        await tx.organization.delete({ where: { slug: SEED_ORG_SLUG } });
        console.log(
          `  - Deleted organization '${SEED_ORG_SLUG}' and its members.`
        );
      }
    })
    .catch((err) => {
      // It's okay if things are not found to be deleted.
      if (err.code !== "P2025") {
        console.error("Cleanup failed:", err);
        throw err;
      }
    });
  console.log("Cleanup finished.");

  // 3. Create new seed data
  console.log("Creating new seed data...");
  // Create an organization for the user
  const organization = await prisma.organization.create({
    data: {
      id: `org_${Date.now()}`,
      name: `Seeded Organization`,
      slug: SEED_ORG_SLUG,
      createdAt: new Date(),
    },
  });
  console.log(`  - Created organization: ${organization.name}`);

  // Make the user the owner of the organization
  await prisma.member.create({
    data: {
      id: `member_${user.id}_${organization.id}`,
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
      createdAt: new Date(),
    },
  });
  console.log(`  - Made ${user.name} an owner of ${organization.name}`);

  // Create Agents
  const agentsToCreate = [
    {
      agentId: "seeded-web-analyzer",
      name: "Seeded Web Analyzer",
      description: "An agent that can analyze web pages.",
      private: false,
      runtime: "node",
      organizationId: organization.id,
      versions: [
        {
          version: "0.0.1",
          tags: ["latest"],
          capabilities: [
            {
              capabilityId: "analyze-website",
              description:
                "Analyzes a given website URL and returns a summary.",
              input: { url: "string" },
              output: { summary: "string" },
            },
            {
              capabilityId: "get-headers",
              description: "Gets the HTTP headers for a given URL.",
              input: { url: "string" },
              output: { headers: "object" },
            },
          ],
        },
      ],
    },
    {
      agentId: "seeded-image-processor",
      name: "Image Processor",
      description: "Processes images: resize, compress, and apply filters.",
      private: true,
      runtime: "python",
      organizationId: organization.id,
      versions: [
        {
          version: "1.0.0",
          tags: ["latest", "stable"],
          capabilities: [
            {
              capabilityId: "resize-image",
              description: "Resizes an image to the specified dimensions.",
              input: { source: "string", width: "number", height: "number" },
              output: { result: "string" },
            },
            {
              capabilityId: "compress-image",
              description: "Compresses an image to reduce file size.",
              input: { source: "string", quality: "number" },
              output: { result: "string" },
            },
          ],
        },
      ],
    },
    {
      agentId: "seeded-data-scraper",
      name: "Data Scraper",
      description: "A powerful agent to scrape data from websites.",
      private: false,
      runtime: "node",
      organizationId: null, // User-owned
      versions: [
        {
          version: "0.1.0",
          tags: ["beta"],
          capabilities: [
            {
              capabilityId: "scrape-table",
              description: "Scrapes a table from a given URL.",
              input: { url: "string", selector: "string" },
              output: { data: "array" },
            },
          ],
        },
        {
          version: "0.0.5",
          tags: [],
          capabilities: [
            {
              capabilityId: "scrape-links",
              description: "Scrapes all links from a given URL.",
              input: { url: "string" },
              output: { links: "array" },
            },
          ],
        },
      ],
    },
    {
      agentId: "seeded-code-formatter",
      name: "Code Formatter",
      description: "Formats source code for various languages.",
      private: false,
      runtime: "node",
      organizationId: organization.id,
      versions: [
        {
          version: "2.1.3",
          tags: ["latest"],
          capabilities: [
            {
              capabilityId: "format-javascript",
              description: "Formats JavaScript code.",
              input: { code: "string" },
              output: { formattedCode: "string" },
            },
            {
              capabilityId: "format-python",
              description: "Formats Python code.",
              input: { code: "string" },
              output: { formattedCode: "string" },
            },
          ],
        },
      ],
    },
    {
      agentId: "seeded-sentiment-analyzer",
      name: "Sentiment Analyzer",
      description: "Analyzes text to determine its sentiment.",
      private: true,
      runtime: "python",
      organizationId: organization.id,
      versions: [
        {
          version: "1.2.0",
          tags: [],
          capabilities: [
            {
              capabilityId: "analyze-sentiment",
              description: "Analyzes the sentiment of a block of text.",
              input: { text: "string" },
              output: { sentiment: "string", score: "number" },
            },
          ],
        },
      ],
    },
  ];

  for (const agentData of agentsToCreate) {
    const agent = await prisma.agent.create({
      data: {
        agentId: agentData.agentId,
        name: agentData.name,
        description: agentData.description,
        private: agentData.private,
        runtime: agentData.runtime,
        keys: {
          publicKey: `some-public-key-for-${agentData.agentId}`,
        },
        userId: user.id,
        organizationId: agentData.organizationId,
      },
    });
    console.log(`  - Created agent: ${agent.name}`);

    for (const versionData of agentData.versions) {
      const agentVersion = await prisma.agentVersion.create({
        data: {
          agentId: agent.id,
          version: versionData.version,
          tags: versionData.tags,
        },
      });
      console.log(
        `    - Created agent version: ${agent.name}@${agentVersion.version}`
      );

      if (versionData.capabilities.length > 0) {
        await prisma.agentCapability.createMany({
          data: versionData.capabilities.map((cap) => ({
            agentVersionId: agentVersion.id,
            capabilityId: cap.capabilityId,
            description: cap.description,
            input: cap.input,
            output: cap.output,
          })),
        });
        console.log(
          `      - Created ${versionData.capabilities.length} capabilities.`
        );
      }
    }
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
