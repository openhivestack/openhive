"use client";

import { createCustomerPortal } from "@/ee/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ManageSubscription({ referenceId, returnUrl }: { referenceId: string, returnUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleManage = () => {
    startTransition(async () => {
      try {
        const { url } = await createCustomerPortal(referenceId, returnUrl);
        if (url) {
          router.push(url);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to open billing portal");
      }
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleManage}
      disabled={isPending}
      className="w-full"
    >
      {isPending ? "Loading..." : "Manage Subscription"}
    </Button>
  );
}
