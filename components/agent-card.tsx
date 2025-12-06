"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Globe, ShieldCheck, Lock, LockOpen, Code2 } from "lucide-react";
import { AgentDetail } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentCardProps {
  agent: Omit<Partial<AgentDetail>, 'latestVersion'> & {
    latestVersion?: string | null;
    protocolVersion?: string | null;
    user?: { name: string | null } | null;
    organization?: { name: string | null } | null;
    _count?: { executions: number };
  };
  className?: string;
  showVerification?: boolean;
}

export function AgentCard({ agent, className, showVerification = true }: AgentCardProps) {
  const isVerified = agent.verificationStatus === "VERIFIED";

  return (
    <Card className={cn("group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-primary/10 bg-secondary/30 backdrop-blur-sm overflow-hidden relative pb-0", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-2">
            {showVerification && isVerified ? (
              <Badge variant="outline" className="bg-background/50 backdrop-blur border-primary/20 text-primary gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-background/50 backdrop-blur border-muted-foreground/20 text-muted-foreground gap-1 shadow-sm">
                {agent.isPublic ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {agent.isPublic ? "Public" : "Private"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {agent.organization && (
              <Badge variant="secondary" className="text-xs bg-secondary/50">
                {agent.organization.name}
              </Badge>
            )}
            {agent.runtime && ['node', 'python'].includes(agent.runtime.toLowerCase()) && (
              <div className="relative h-6 w-6 rounded-full bg-muted/50 p-1 ring-1 ring-border/50 overflow-hidden shrink-0">
                <img
                  src={`/${agent.runtime.toLowerCase()}.png`}
                  alt={agent.runtime}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>
        <CardTitle className="text-md group-hover:text-primary transition-colors relative z-10 flex items-center gap-2">
          <Link href={`/agent/${agent.name}/overview`} className="hover:underline underline-offset-4 decoration-primary/50">
            {agent.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-[2.5rem] relative z-10 text-xs">
          {agent.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.tags && agent.tags.length > 0 ? agent.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 bg-secondary/30 hover:bg-secondary/50 transition-colors">
              #{tag}
            </Badge>
          )) : (
            <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed text-muted-foreground/50">
              No tags
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 border-t pt-3 border-border/50">
          <span>Maintained by <span className="font-medium text-foreground">{agent.user?.name || "Unknown"}</span></span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/20 py-3 relative z-10">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <span className="flex items-center gap-1">
            v{agent.latestVersion || "0.0.1"}
          </span>
          {agent.protocolVersion && (
            <>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-muted-foreground/70" title="A2A Protocol Version">
                A2A v{agent.protocolVersion}
              </span>
            </>
          )}
          <span className="text-muted-foreground/30">•</span>
          <span title="Total Executions">
            <span className="text-primary">{agent._count?.executions || 0}</span> runs
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="icon" variant="ghost" className="hover:bg-primary/10 hover:text-primary h-8 w-8">
                <Link href={`/agent/${agent.name}/overview`}>
                  <Globe className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
