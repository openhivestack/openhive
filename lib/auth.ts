import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { nextCookies } from "better-auth/next-js";
import {
  oneTimeToken,
  admin,
  deviceAuthorization,
  bearer,
  organization,
} from "better-auth/plugins";
import { apiKey } from "better-auth/plugins";

export type { UserSession } from "./types";

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    user: {},
  },
  socialProviders: {
    github: {
      clientId: (process.env.GH_CLIENT_ID as string) || "",
      clientSecret: (process.env.GH_CLIENT_SECRET as string) || "",
    },
  },
  plugins: [
    admin(),
    organization(),
    nextCookies(),
    bearer(), // Enable Bearer token authentication
    oneTimeToken({
      expiresIn: 60 * 5, // 5 minutes
    }),
    deviceAuthorization({
      // Optional configuration
      expiresIn: "5m", // Device code expiration time
      interval: "5s", // Minimum polling interval
    }),
    apiKey({
      rateLimit: {
        enabled: true,
        timeWindow: 60, // 1 minute
        maxRequests: 1000, // 1000 requests per minute for staging
      },
    }),
  ],
});
