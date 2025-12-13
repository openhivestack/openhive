"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { DotPattern } from "@/components/ui/dot-pattern";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAgent } from "@/hooks/use-agent";
import { toast } from "sonner";
import { DateTime } from "luxon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { updateAgentVisibility } from "@/ee/lib/actions/agent";
import { Lock, Globe, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTransition } from "react";

export default function SettingsPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const { agent, loading: isLoading, features } = useAgent();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPrivate = !agent?.isPublic;

  const handleVisibilityToggle = (checked: boolean) => {
    if (!agent) return;
    const newIsPublic = !checked;

    startTransition(async () => {
      try {
        await updateAgentVisibility(agent.name, newIsPublic);
        // await refetch(); // SWR revalidates on focus, or we can force it if useAgent exposed it. 
        // useAgent exposes refetch!
        toast.success(
          newIsPublic
            ? "Agent is now Public! 🌍"
            : "Agent is now Private. 🔒"
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to update visibility");
      }
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agent/${agentName}/toggle`, {
        method: "POST",
        body: JSON.stringify({ status: "stopped" }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to delete");

      toast.success(data.message || "Agent service stopped successfully");
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to stop agent service"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const lastUpdated = agent?.updatedAt ? (
    DateTime.fromISO(agent.updatedAt as unknown as string).toRelative()
  ) : isLoading ? (
    <Spinner className="size-3 animate-spin" />
  ) : (
    "Never"
  );

  return (
    <div className="p-4 space-y-6">
      <Card className="pb-0 gap-4">
        <CardHeader>
          <CardTitle className="text-sm">Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CardDescription>
            Used to identify your Agent on the Dashboard, OpenHive CLI, and in
            the URL of your Deployments.
          </CardDescription>
          <ButtonGroup>
            <ButtonGroupText asChild>
              <Label htmlFor="url" className="font-normal">
                openhive.cloud/agent/
              </Label>
            </ButtonGroupText>
            <InputGroup className="rounded-md">
              <InputGroupInput id="url" value={agentName} readOnly />
            </InputGroup>
          </ButtonGroup>
        </CardContent>
        <CardFooter className="flex bg-accent py-2 rounded-b-xl flex-wrap gap-1 text-xs">
          Learn more about{" "}
          <Link
            href={`https://docs.openhive.cloud/docs/concepts/agents`}
            target="_blank"
            className="mt-0.5 font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            Agent Card <ExternalLink className="size-3" />
          </Link>
        </CardFooter>
      </Card>

      <Card className="pb-0 gap-4">
        <CardHeader>
          <CardTitle className="text-sm">ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CardDescription>
            The unique identifier for your Agent.
          </CardDescription>
          <ButtonGroup>
            <InputGroup className="rounded-md">
              <InputGroupInput
                value={agent?.id || "Loading..."}
                readOnly
                disabled
              />
            </InputGroup>
            <ButtonGroupText
              onClick={() =>
                agent?.id && navigator.clipboard.writeText(agent.id)
              }
              className="cursor-pointer hover:text-primary/80"
            >
              <Copy className="size-3" />
            </ButtonGroupText>
          </ButtonGroup>
        </CardContent>
        <CardFooter className="flex bg-accent py-2 rounded-b-xl flex-wrap gap-1 text-xs">
          Learn more about{" "}
          <Link
            href={`https://docs.openhive.cloud/docs/concepts/agents`}
            target="_blank"
            className="mt-0.5 font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            Agent ID <ExternalLink className="size-3" />
          </Link>
        </CardFooter>
      </Card>


      {features?.billing && (
        <Card className="border-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              Visibility
              {isPrivate ? <Lock className="size-4 text-orange-500" /> : <Globe className="size-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Control who can see and use this agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-background/50">
              <div className="space-y-0.5">
                <Label className="text-base">Private Agent</Label>
                <p className="text-sm text-muted-foreground">
                  Restricts access to only members of your organization.
                </p>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={handleVisibilityToggle}
                disabled={isPending || isLoading}
              />
            </div>

            {agent?.organizationId && !isPrivate && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Billing Note</AlertTitle>
                <AlertDescription>
                  Making an agent private requires an active Pro subscription for your organization.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="pb-0 gap-4 border-destructive">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">
            Delete Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="border-b pb-2">
            Stop your Agent&apos;s deployed service. Version history will be
            preserved.
          </CardDescription>
          <div className="flex items-start gap-2 py-2 px-4">
            <div className="relative flex size-[80px] flex-col items-center justify-center overflow-hidden border border-border/40 rounded-lg">
              <DotPattern
                glow={true}
                className={cn(
                  "[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]"
                )}
              />
            </div>
            <div className="flex items-start gap-1 flex-col mt-2">
              <div className="text-sm font-medium text-destructive">
                {agentName}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Last updated {lastUpdated}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex bg-destructive/10 py-2 rounded-b-xl justify-end gap-1 text-xs">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action will stop the running service for{" "}
                  <strong>{agentName}</strong>. The agent and its version
                  history will remain in the registry.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Stopping..." : "Confirm Stop Service"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div >
  );
}
