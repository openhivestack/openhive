"use client";

import { createCheckoutSession } from "@/ee/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RedirectToCheckout({ referenceId, returnUrl, plan = "pro" }: { referenceId: string, returnUrl: string, plan?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUpgrade = () => {
    startTransition(async () => {
      try {
        const { url } = await createCheckoutSession(referenceId, returnUrl, plan);
        if (url) {
          router.push(url);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to start checkout");
      }
    });
  };

  return (
    <Button
      onClick={handleUpgrade}
      disabled={isPending}
      className="w-full"
    >
      {isPending ? "Redirecting..." : "Upgrade to Pro"}
    </Button>
  );
}
