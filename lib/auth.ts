import { betterAuth, User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { Session } from "better-auth/types";
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

export type ValidationResult = {
  session: {
    user: User;
    session: Session;
  } | null;
  user: User | null;
  type: "session" | "api-key";
};

/**
 * Validates authentication using either X-API-Key header or Session cookie.
 * Priority:
 * 1. X-API-Key header
 * 2. Session cookie
 */
export async function validateAuth(): Promise<ValidationResult | null> {
  const headerList = await headers();
  const apiKey = headerList.get("x-api-key");

  // 1. Try API Key validation
  if (apiKey) {
    try {
      const result = await auth.api.verifyApiKey({
        body: {
          key: apiKey,
        },
        headers: headerList,
      });

      if (result && result.key) {
        // If the API key is valid but user object is missing (which seems to be happening),
        // fetch the user from the database using the userId from the key.
        // @ts-expect-error - user is not typed in the result
        let user = result.user;

        if (!user && result.key.userId) {
          // Manual user fetch as fallback
          const dbUser = await prisma.user.findUnique({
            where: { id: result.key.userId },
          });

          if (dbUser) {
            // Cast Prisma user to Better-Auth User type (fields should match closely enough)
            // We might need to map fields if there's a mismatch (e.g. createdAt Date vs string)
            user = {
              ...dbUser,
              createdAt: dbUser.createdAt,
              updatedAt: dbUser.updatedAt,
            } as unknown as User;
          }
        }

        if (user) {
          // Create a synthetic session object for compatibility with existing code that expects session
          const syntheticSession: Session = {
            id: `apikey-${result.key.id}`,
            userId: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            token: apiKey,
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: headerList.get("x-forwarded-for") || "unknown",
            userAgent: headerList.get("user-agent"),
          };

          return {
            session: {
              user: user,
              session: syntheticSession,
            },
            user: user,
            type: "api-key",
          };
        }
      }
    } catch (error) {
      console.error("API Key validation failed:", error);
      return null;
    }
  }

  // 2. Fallback to Session validation
  const session = await auth.api.getSession({
    headers: headerList,
  });

  if (session) {
    return {
      session,
      user: session.user,
      type: "session",
    };
  }

  return null;
}
