"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function createCheckoutSession(referenceId: string, returnUrl: string, plan: string = "pro") {
  const headerList = await headers();

  // Check if there is an existing subscription for this referenceId
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      referenceId: referenceId,
      status: 'active' // Only look for active subscriptions to upgrade/switch
    }
  });

  // Call Better-Auth API to create checkout session
  // Note: ensure 'pro' matches the plan name in auth config
  const res = await auth.api.upgradeSubscription({
    body: {
      plan: plan,
      referenceId: referenceId,
      successUrl: `${returnUrl}?success=true`,
      cancelUrl: `${returnUrl}?canceled=true`,
      subscriptionId: existingSubscription?.stripeSubscriptionId || undefined, // Pass subscriptionId if upgrading/switching
    },
    headers: headerList
  });

  if (!res?.url) {
    throw new Error("Failed to create checkout session");
  }

  return { url: res.url };
}

export async function createCustomerPortal(referenceId: string, returnUrl: string) {
  const headerList = await headers();
  const res = await auth.api.createBillingPortal({
    body: {
      referenceId: referenceId,
      returnUrl: returnUrl,
    },
    headers: headerList
  });

  if (!res?.url) {
    throw new Error("Failed to create billing portal");
  }

  return { url: res.url };
}

export async function getUserSubscription() {
  const auth = await validateAuth();
  if (!auth?.user) return null;

  const subscription = await prisma.subscription.findFirst({
    where: { referenceId: auth.user.id }
  });

  return subscription;
}

export async function getOrganizationSubscription(organizationId: string) {
  const auth = await validateAuth();
  if (!auth?.user) return null;

  // Verify access
  const member = await prisma.member.findFirst({
    where: { userId: auth.user.id, organizationId }
  });
  if (!member) return null;

  const subscription = await prisma.subscription.findFirst({
    where: { referenceId: organizationId }
  });

  return subscription;
}
