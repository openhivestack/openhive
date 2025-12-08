"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import millify from "millify";
import Link from "next/link";
import { AgentDetail } from "@/lib/api-client";
import { ShieldCheck, Lock, LockOpen, Code2 } from "lucide-react";
import Image from "next/image";

interface AgentTableProps {
  agents: AgentDetail[];
  renderActions?: (agent: AgentDetail) => React.ReactNode;
}

export function AgentTable({ agents, renderActions }: AgentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Agent</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Runtime</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead className="text-right">Stats</TableHead>
          {renderActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => {
          const isVerified = agent.verificationStatus === "VERIFIED";

          return (
            <TableRow key={agent.id || agent.name}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/agent/${agent.name}`}
                      className="font-medium hover:text-primary flex items-center gap-1"
                    >
                      {agent.name}
                    </Link>
                    {isVerified && (
                      <ShieldCheck className="w-3 h-3 text-primary" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                    {agent.description || "No description"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    v{agent.latestVersion} • By {agent.user?.name || agent.user?.username || "Unknown"}
                  </div>
                </div>
              </TableCell>

              <TableCell>
                {agent.organization ? (
                  <div className="flex items-center gap-2">
                    {agent.organization.logo && (
                      <Image
                        src={agent.organization.logo}
                        alt={agent.organization.name}
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                    )}
                    <span className="text-sm">{agent.organization.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>

              <TableCell>
                {agent.runtime && ['node', 'python'].includes(agent.runtime.toLowerCase()) ? (
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-5 w-5 rounded-full bg-muted/50 p-0.5 overflow-hidden shrink-0">
                      <img
                        src={`/${agent.runtime.toLowerCase()}.png`}
                        alt={agent.runtime}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-xs capitalize">{agent.runtime}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>

              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {agent.tags?.slice(0, 3).map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="rounded-sm px-1.5 py-0 text-[10px]"
                    >
                      #{tag}
                    </Badge>
                  ))}
                  {agent.tags?.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{agent.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`gap-1 ${!agent.isPublic ? "border-muted-foreground/30 text-muted-foreground" : "border-primary/20 text-primary"}`}
                >
                  {!agent.isPublic ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                  {!agent.isPublic ? "Private" : "Public"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-sm font-medium">
                    {millify(agent._count?.executions || agent.installCount || agent.downloads || 0)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Runs</span>
                </div>
              </TableCell>
              {renderActions && (
                <TableCell className="text-right">
                  {renderActions(agent)}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

