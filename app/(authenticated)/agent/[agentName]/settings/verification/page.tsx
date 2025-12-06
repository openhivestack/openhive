import { prisma } from "@/lib/db";
import { VerificationClient } from "./client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

export default async function VerificationPage({ params }: { params: Promise<{ agentName: string }> }) {
  const { agentName } = await params;

  const agent = await prisma.agent.findUnique({
    where: { name: agentName },
  });

  if (!agent) {
    return <div>Agent not found</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Verification</CardTitle>
          <CardDescription>
            Verify your agent to list it on the OpenHive Hub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-md">
            {agent.verificationStatus === "VERIFIED" && (
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="w-8 h-8" />
                <div>
                  <div className="font-bold">Verified</div>
                  <div className="text-sm text-muted-foreground">Your agent is listed on the Hub.</div>
                </div>
              </div>
            )}
            {agent.verificationStatus === "PENDING" && (
              <div className="flex items-center gap-2 text-yellow-600">
                <ShieldQuestion className="w-8 h-8" />
                <div>
                  <div className="font-bold">Under Review</div>
                  <div className="text-sm text-muted-foreground">Our team is reviewing your agent.</div>
                </div>
              </div>
            )}
            {(agent.verificationStatus === "UNVERIFIED" || agent.verificationStatus === "REJECTED") && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldAlert className="w-8 h-8" />
                <div>
                  <div className="font-bold">Not Verified</div>
                  <div className="text-sm text-muted-foreground">Submit your agent for verification.</div>
                  {agent.verificationStatus === "REJECTED" && (
                    <div className="text-xs text-red-500 mt-1">Previous submission was rejected.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <VerificationClient agentName={agentName} status={agent.verificationStatus} />
        </CardContent>
      </Card>
    </div>
  );
}
