"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function OrganizationDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
          <CardDescription>
            View and manage your organization details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Overview Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            We are building a comprehensive dashboard for your organization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
