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

interface AgentTableProps {
  agents: AgentDetail[];
}

export function AgentTable({ agents }: AgentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Skills</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead className="text-right">Downloads</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.name}>
            <TableCell>
              <div className="flex flex-col">
                <Link
                  href={`/agent/${agent.name}`}
                  className="font-medium hover:text-primary"
                >
                  {agent.name}
                </Link>
                <Link
                  href={`/agent/${agent.name}`}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  v{agent.latestVersion}
                </Link>
              </div>
            </TableCell>
            <TableCell>{agent.description}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2">
                {agent.skills?.map((skill: any) => (
                  <Badge
                    key={skill.id}
                    variant="skill"
                    className="rounded-sm"
                    size="sm"
                  >
                    {skill.name || skill.id}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={!agent.isPublic ? "private" : "public"}
                size="sm"
                className="py-0 mt-1"
              >
                {!agent.isPublic ? "Private" : "Public"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {millify(agent.installCount || agent.downloads || 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
