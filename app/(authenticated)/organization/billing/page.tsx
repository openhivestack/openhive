import Link from "next/link";
import { Button } from "@/components/ui/button";
import { validateAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RedirectToCheckout } from "@/components/billing/redirect-to-checkout";
import { ManageSubscription } from "@/components/billing/manage-subscription";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default async function BillingPage() {
  const auth = await validateAuth();
  if (!auth?.session || !auth.user) {
    return <div>Unauthorized</div>;
  }

  // Get all memberships to check status
  const memberships = await prisma.member.findMany({
    where: { userId: auth.user.id },
    include: { organization: true },
  });

  const adminMember = memberships.find(m => ['owner', 'admin'].includes(m.role));

  if (!adminMember) {
    if (memberships.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center min-h-[50vh]">
          <h2 className="text-xl font-semibold">No Organization Found</h2>
          <p className="text-muted-foreground max-w-md">
            You are not a member of any organization yet. Create one to collaborate with a team, or manage your personal billing in settings.
          </p>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/organization/create">Create Organization</Link>
            </Button>
            <Button asChild>
              <Link href="/settings">Go to Personal Settings</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You must be an owner or admin of an organization to manage billing.</p>
      </div>
    );
  }

  const organization = adminMember.organization;

  const subscription = await prisma.subscription.findFirst({
    where: { referenceId: organization.id },
  });

  const isPro = subscription?.status === 'active';

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your organization's subscription and payment methods.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Plan Card */}
        <Card className={isPro ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              {isPro ? "Pro Plan" : "Free Plan"}
              {isPro && <Badge>Active</Badge>}
            </CardTitle>
            <CardDescription>
              {isPro ? "Supercharge your agent fleet." : "Perfect for getting started."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              {isPro ? "$29" : "$0"}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {isPro ? "Unlimited Public Agents" : "Unlimited Public Agents"}
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {isPro ? "Unlimited Private Agents" : "0 Private Agents"}
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {isPro ? "Priority Support" : "Community Support"}
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {isPro ? (
              <ManageSubscription referenceId={organization.id} returnUrl="/organization/billing" />
            ) : (
              <RedirectToCheckout referenceId={organization.id} returnUrl="/organization/billing" />
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
