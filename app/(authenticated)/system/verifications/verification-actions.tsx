"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { approveAgent, denyAgent } from "./actions";
import { toast } from "sonner";
import { useState } from "react";
import { AgentDetail } from "@/lib/api-client";

interface VerificationActionsProps {
  agent: AgentDetail;
}

export function VerificationActions({ agent }: VerificationActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveAgent(agent.id);
      if (result.success) {
        toast.success(`Approved ${agent.name}`);
      } else {
        toast.error(result.error || "Failed to approve agent");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!confirm(`Are you sure you want to deny ${agent.name}?`)) return;

    setLoading(true);
    try {
      const result = await denyAgent(agent.id);
      if (result.success) {
        toast.success(`Denied ${agent.name}`);
      } else {
        toast.error(result.error || "Failed to deny agent");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDeny}
        disabled={loading}
        title="Deny"
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-500/10"
        onClick={handleApprove}
        disabled={loading}
        title="Approve"
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
