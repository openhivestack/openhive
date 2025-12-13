import { isFeatureEnabled } from "@/lib/features";
import AgentLayoutClient from "./client-layout";
import { ReactNode } from "react";

export default async function AgentLayout({ children }: { children: ReactNode }) {
  const billingEnabled = await isFeatureEnabled("billing");

  return (
    <AgentLayoutClient
      features={{ billing: billingEnabled }}
    >
      {children}
    </AgentLayoutClient>
  );
}
