"use client";

import { useSession, authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getUserSubscription } from "@/ee/lib/actions/billing";
import { RedirectToCheckout } from "@/components/billing/redirect-to-checkout";
import { ManageSubscription } from "@/components/billing/manage-subscription";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: session, isPending, refetch } = useSession();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showBilling, setShowBilling] = useState(false);

  // Sync state with session data
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
    }
  }, [session]);

  // Fetch subscription and feature flag
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING === 'true') {
      setShowBilling(true);
      getUserSubscription().then(setSubscription);
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await authClient.updateUser({
        name: name,
      });
      await refetch();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This is how others will see you on the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border">
              <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
              <AvatarFallback className="text-xl">{user?.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium">Profile Picture</h3>
              <p className="text-xs text-muted-foreground">
                Managed via your authentication provider (e.g. GitHub).
              </p>
            </div>
          </div>

          <div className="grid gap-2 max-w-md">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="grid gap-2 max-w-md">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Email address is managed by your identity provider.
            </p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 border-t py-4">
          <Button onClick={handleSaveProfile} disabled={isSaving || name === user?.name}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      {/* Billing Section (Personal) */}
      {showBilling && showBilling === true && (
        <Card className={subscription?.status === 'active' ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Plan & Billing
              {subscription?.status === 'active' && <Badge>Pro Active</Badge>}
            </CardTitle>
            <CardDescription>
              Manage your personal subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {subscription?.status === 'active' ? "Pro Plan" : "Free Plan"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {subscription?.status === 'active'
                    ? "You have access to all Pro features."
                    : "Upgrade to unlock private agents and more."}
                </div>
              </div>
              <div className="w-full sm:w-auto">
                {subscription?.status === 'active' ? (
                  <ManageSubscription referenceId={user?.id || ""} returnUrl="/settings" />
                ) : (
                  <RedirectToCheckout referenceId={user?.id || ""} returnUrl="/settings" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="font-medium">Theme</h4>
            <p className="text-sm text-muted-foreground">
              Select your preferred color theme.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatedThemeToggler />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently remove your Personal Account and all of its contents.
              </p>
            </div>
            <Button variant="destructive" disabled>Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
