"use client";

import { ReactNode } from "react";
import { SubHeader, Tab } from "@/components/sub-header";
import { Home, Settings, Terminal } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { AgentProvider } from "@/hooks/use-agent";
import { AgentHeader } from "@/components/agent-header";

interface Props {
  children: ReactNode;
}

export default function AgentLayout({ children }: Props) {
  const params = useParams();
  const agentName = params.agentName as string;
  const pathname = usePathname();
  const activeTab = pathname.split("/").pop();

  const tabs: Tab[] = [
    {
      label: "Overview",
      href: `/agent/${agentName}/overview`,
      key: "overview",
      icon: Home,
    },
    {
      label: "Logs",
      href: `/agent/${agentName}/logs`,
      key: "logs",
      icon: Terminal,
    },
    {
      label: "Settings",
      href: `/agent/${agentName}/settings`,
      key: "settings",
      icon: Settings,
    },
  ];

  return (
    <AgentProvider agentName={agentName}>
      <div>
        <AgentHeader />
        <SubHeader activeTab={activeTab} tabs={tabs} />

        <div>
          {children}
        </div>
      </div>
    </AgentProvider>
  );
}
