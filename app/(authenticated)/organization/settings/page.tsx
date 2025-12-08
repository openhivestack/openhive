"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function OrgSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Configure general settings for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Settings Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            Organization-level configuration options will be available here shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
