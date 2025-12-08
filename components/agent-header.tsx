"use client";

import { Header } from "@/components/header";
import { useAgent } from "@/hooks/use-agent";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import { BotIcon, Loader2, Pause, Play } from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";
import { Button } from "./ui/button";

export const AgentHeader = () => {
  const {
    agent,
    loading,
    runtimeStatus,
    loadingRuntime,
    togglingRuntime,
    isTransitioning,
    toggleRuntime,
  } = useAgent();

  if (loading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (!agent) {
    return <div>Agent not found</div>;
  }

  return (
    <Header>
      <div className="flex w-full justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative size-8 overflow-hidden rounded-full flex items-center justify-center border border-border">
            <ShineBorder />
            <BotIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">{agent.name}</h1>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {agent.version}
              <span className="text-sm text-muted-foreground font-bold">•</span>
              {agent.private ? (
                <span className="text-xs text-red-500">Private</span>
              ) : (
                <span className="text-xs text-green-500">Public</span>
              )}
              <span className="text-sm text-muted-foreground font-bold">•</span>
              A2A {agent.protocolVersion}
              <span className="text-sm text-muted-foreground font-bold">•</span>
              {loadingRuntime ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <Badge
                  variant={runtimeStatus === "RUNNING" ? "running" : "stopped"}
                  size="sm"
                >
                  {runtimeStatus === "RUNNING" ? "Running" : runtimeStatus}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleRuntime}
            disabled={loadingRuntime || togglingRuntime || isTransitioning}
          >
            {togglingRuntime || loadingRuntime ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : runtimeStatus === "RUNNING" ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
        </div>
      </div>
    </Header>
  );
};
