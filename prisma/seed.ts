import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const requiredEnvVars = [
    "ROOT_ORG_SLUG",
    "ROOT_ORG_ID",
    "ROOT_ORG_NAME",
    "ROOT_USER_EMAIL",
    "ROOT_USER_NAME",
    "ROOT_USER_ID",
    "ROOT_USER_ROLE",
    "ROOT_MEMBER_ROLE",
    "ROOT_USER_PASSWORD",
  ];

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables for seeding: ${missingEnvVars.join(", ")}`
    );
  }

  // 1. Ensure root organization exists
  const rootOrgSlug = process.env.ROOT_ORG_SLUG!;
  const rootOrgId = process.env.ROOT_ORG_ID!;
  const rootOrgName = process.env.ROOT_ORG_NAME!;

  console.log(`Ensuring root organization: ${rootOrgSlug}`);
  const rootOrg = await prisma.organization.upsert({
    where: { slug: rootOrgSlug },
    update: {
      name: rootOrgName,
      // We don't update ID as it's the primary key/invariant usually, but slug is unique.
      // Modifying ID might break relations if not cascaded, better to keep ID stable if possible
      // or rely on slug.
      metadata: JSON.stringify({ type: "root", description: "Official OpenHive Organization" }),
    },
    create: {
      id: rootOrgId,
      name: rootOrgName,
      slug: rootOrgSlug,
      createdAt: new Date(),
      metadata: JSON.stringify({ type: "root", description: "Official OpenHive Organization" }),
    },
  });
  console.log(`Root organization '${rootOrg.slug}' secured.`);

  // 2. Ensure root user exists
  const rootUserEmail = process.env.ROOT_USER_EMAIL!;
  const rootUserName = process.env.ROOT_USER_NAME!;
  const rootUserId = process.env.ROOT_USER_ID!;
  const rootUserRole = process.env.ROOT_USER_ROLE!;

  console.log(`Ensuring root user: ${rootUserEmail}`);
  const rootUser = await prisma.user.upsert({
    where: { email: rootUserEmail },
    update: {
      name: rootUserName,
      role: rootUserRole,
      emailVerified: true,
      // Avoid overwriting other fields like image if user updated them manually
    },
    create: {
      id: rootUserId,
      name: rootUserName,
      email: rootUserEmail,
      emailVerified: true,
      role: rootUserRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`Root user '${rootUser.email}' secured.`);

  // 3. Ensure Root User is Member of Root Org
  const rootMemberRole = process.env.ROOT_MEMBER_ROLE!;
  const existingMember = await prisma.member.findFirst({
    where: {
      userId: rootUser.id,
      organizationId: rootOrg.id,
    },
  });

  if (existingMember) {
    if (existingMember.role !== rootMemberRole) {
      console.log(`Updating root member role to '${rootMemberRole}'...`);
      await prisma.member.update({
        where: { id: existingMember.id },
        data: { role: rootMemberRole },
      });
    } else {
      console.log("Root member role is up to date.");
    }
  } else {
    console.log("Adding root user to root organization...");
    await prisma.member.create({
      data: {
        id: "openhive-root-member", // Or random UUID if preferred, keeping static for predictability
        userId: rootUser.id,
        organizationId: rootOrg.id,
        role: rootMemberRole,
        createdAt: new Date(),
      },
    });
  }

  // 4. Ensure Root User has a password (Account)
  const rootUserPassword = process.env.ROOT_USER_PASSWORD!;
  
  // @ts-ignore
  const { hashPassword } = await import("better-auth/crypto"); // safely import

  if (typeof hashPassword === "function") {
      const hashedPassword = await hashPassword(rootUserPassword);

      const existingAccount = await prisma.account.findFirst({
        where: { 
          userId: rootUser.id,
          providerId: "credential" 
        },
      });

      if (existingAccount) {
        console.log("Updating root user password...");
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        });
      } else {
        console.log("Creating password account for root user...");
        await prisma.account.create({
          data: {
            id: "root-user-account", 
            accountId: rootUserEmail,
            providerId: "credential",
            userId: rootUser.id,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      console.log("Root user password secured.");
  } else {
      console.warn("Could not import hashPassword. Skipping password update.");
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
