"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  agentName: string;
  status: string;
}

export function VerificationClient({ agentName, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/agent/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentName }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to submit");
        }

        toast.success("Agent submitted for verification!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  if (status === "VERIFIED" || status === "PENDING") {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Button onClick={handleSubmit} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit for Review
      </Button>
    </div>
  );
}
