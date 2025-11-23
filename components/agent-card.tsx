import { Code2, Download, Lock, LockOpen } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import { isEmpty } from "lodash";
import Image from "next/image";
import PythonIcon from "@/public/python.png";
import NodeIcon from "@/public/node.png";
import millify from "millify";

const runtimeIcons = {
  python: PythonIcon,
  node: NodeIcon,
};

interface AgentCardProps {
  agent: any;
  compact?: boolean;
  className?: string;
}

export const AgentCard = ({
  agent,
  compact = false,
  className = "",
}: AgentCardProps) => {
  const RuntimeIcon = runtimeIcons[agent.runtime as keyof typeof runtimeIcons];

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "RUNNING":
        return "bg-emerald-200/50 dark:bg-emerald-800/50";
      case "STOPPED":
        return "bg-red-200/50 dark:bg-red-800/50";
      case "UNKNOWN":
        return "bg-yellow-200/50 dark:bg-yellow-800/50";
      default:
        return "bg-zinc-200/50 dark:bg-zinc-800/50";
    }
  };

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border-border/60 bg-card text-card-foreground shadow-sm transition-all hover:border-primary/20 hover:shadow-md",
        className
      )}
    >
      {/* Status Stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          getStatusColor(agent.status)
        )}
      />

      <div
        className={cn(
          "flex flex-1 flex-col p-4 pl-5 gap-3",
          compact && "p-3 pl-4 gap-2"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          {/* Icon & Info */}
          <div className="flex items-start gap-3 overflow-hidden">
            <div
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-secondary/50 text-muted-foreground shadow-sm",
                !isEmpty(agent.runtime) && "bg-secondary/20",
                compact && "h-8 w-8"
              )}
            >
              {RuntimeIcon ? (
                <Image
                  src={RuntimeIcon}
                  alt={agent.runtime}
                  width={compact ? 16 : 20}
                  height={compact ? 16 : 20}
                  className="opacity-90"
                />
              ) : (
                <Code2
                  className={cn("text-primary", compact ? "size-4" : "size-5")}
                />
              )}
            </div>

            <div className="flex flex-col justify-between overflow-hidden py-0.5">
              <h3
                className={cn(
                  "font-semibold leading-tight truncate",
                  compact ? "text-sm" : "text-base"
                )}
              >
                {agent.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  v{agent.version}
                </span>
                {!compact && (
                  <>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />
                    <span className="capitalize truncate max-w-[80px]">
                      {agent.runtime || "Unknown"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Icon (Top Right) */}
          <div className="flex shrink-0 items-center">
            {agent.private ? (
              <Lock className="size-3.5 text-muted-foreground/70" />
            ) : (
              <LockOpen className="size-3.5 text-muted-foreground/70" />
            )}
          </div>
        </div>

        {/* Description */}
        {!compact && (
          <div className="flex-1 py-1">
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
              {agent.description || "No description provided for this agent."}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            !compact && "border-t border-border/40 pt-3 mt-auto"
          )}
        >
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div
              className="flex items-center gap-1.5"
              title={`${agent.downloads || 0} downloads`}
            >
              <Download className="size-3" />
              <span className="font-medium">
                {millify(agent.downloads || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {agent.skills && agent.skills.length > 0 ? (
              <Badge
                variant="secondary"
                className="h-5 px-2 text-[10px] font-normal text-muted-foreground bg-secondary/50 hover:bg-secondary/70"
              >
                {agent.skills.length}{" "}
                {agent.skills.length === 1 ? "Skill" : "Skills"}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 px-2 text-[10px] font-normal text-muted-foreground/50 border-border/50"
              >
                No skills
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
