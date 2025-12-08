"use client";

import { AgentTable } from "@/components/agent-table";
import { VerificationActions } from "./verification-actions";
import { AgentDetail } from "@/lib/api-client";

interface VerificationsTableProps {
  agents: AgentDetail[];
}

export function VerificationsTable({ agents }: VerificationsTableProps) {
  return (
    <AgentTable
      agents={agents}
      renderActions={(agent: AgentDetail) => (
        <VerificationActions agent={agent} />
      )}
    />
  );
}
