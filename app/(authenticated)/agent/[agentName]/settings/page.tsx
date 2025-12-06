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

export default function SettingsPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const { agent, loading: isLoading } = useAgent();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agent/${agentName}`, { method: "DELETE" });
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
    </div>
  );
}
