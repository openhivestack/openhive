import { betterAuth, User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { Session } from "better-auth/types";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "../db";

import {
  oneTimeToken,
  admin,
  deviceAuthorization,
  bearer,
  organization,
  username,
  apiKey, // Added apiKey import
} from "better-auth/plugins";
import { stripe } from "@better-auth/stripe";
import { stripe as stripeClient } from "@/ee/lib/stripe";

// Session type from better-auth
export type UserSession = {
  user: { id: string };
  organization?: { id: string };
  activeOrganizationId?: string;
};

// Conditionally configure social providers
const socialProviders: any = {};
if (process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GH_CLIENT_ID,
    clientSecret: process.env.GH_CLIENT_SECRET,
  };
}

// Define default plugins
const defaultPlugins = [
  admin(),
  organization(),
  nextCookies(),
  bearer(), // Enable Bearer token authentication
  oneTimeToken({
    expiresIn: 60 * 5, // 5 minutes
  }),
  username(),
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
];

// Async function to create auth instance
async function createAuth() {
  let plugins: any[] = [...defaultPlugins];

  try {
    // @ts-ignore - EE module might not exist
    const eeModule = await import("@/ee/lib/auth.config");
    if (eeModule?.eeAuthConfig?.plugins) {
      plugins = [...plugins, ...eeModule.eeAuthConfig.plugins];
    }

    // Check for Billing Feature Flag
    // @ts-ignore
    const { eeFeatures } = await import("@/ee/lib/features");
    if (eeFeatures?.billing?.enabled) {
      plugins.push(
        stripe({
          stripeClient,
          stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
          createCustomerOnSignUp: false, // Disabled to prevent duplicates, handled via hooks
          subscription: {
            enabled: true,
            plans: [
              {
                name: "pro",
                priceId: process.env.STRIPE_PRO_PRICE_ID!,
              }
            ]
          }
        })
      );
    }
  } catch (e) {
    // Ignore missing EE module or features
  }

  return betterAuth({
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
      user: {
        create: {
          before: async (user) => {
            if (!user.email) return;
            try {
              const existingCustomers = await stripeClient.customers.list({ email: user.email, limit: 1 });
              let customerId;

              if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
              } else {
                const newCustomer = await stripeClient.customers.create({
                  email: user.email,
                  name: user.name ?? undefined,
                  metadata: {
                    userId: user.id
                  }
                });
                customerId = newCustomer.id;
              }

              return {
                data: {
                  ...user,
                  stripeCustomerId: customerId
                }
              }
            } catch (e) {
              console.error("Failed to create/link Stripe customer", e);
              // Continue creation without linking? Or throw?
              // Better to continue and maybe retry later or handle error.
              // For now, log error.
            }
          }
        }
      },
    },
    socialProviders,
    emailAndPassword: {
      enabled: true,
    },
    plugins: plugins,
  }) as any;
}

// Export the auth instance (top-level await)
export const auth = await createAuth();

export type ValidationResult = {
  session: {
    user: User;
    session: Session & { activeOrganizationId?: string | null };
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
        // If the API key is valid but user object is missing (which seems to be happening),
        // @ts-ignore
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
      console.error(`[Auth] API Key validation failed: ${error}`);
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
