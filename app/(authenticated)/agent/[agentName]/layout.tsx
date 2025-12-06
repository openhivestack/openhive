"use client";

import { ReactNode } from "react";
import { SubHeader, Tab } from "@/components/sub-header";
import { Home, Settings, Terminal } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { AgentProvider, useAgent } from "@/hooks/use-agent";
import { AgentHeader } from "@/components/agent-header";
import { AgentPublicPage } from "@/components/agent-public-page";
import { Skeleton } from "@/components/ui/skeleton";



interface Props {
  children: ReactNode;
}

function AgentLayoutContent({ children }: Props) {
  const params = useParams();
  const agentName = params.agentName as string;
  const pathname = usePathname();
  const activeTab = pathname.split("/").pop();
  const { isOwner, loading, agent } = useAgent();

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // If public view (not owner)
  if (!isOwner && agent) {
    return <AgentPublicPage agent={agent} />;
  }

  // If owner, show dashboard layout
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
    <div>
      <AgentHeader />
      <SubHeader activeTab={activeTab} tabs={tabs} />

      <div>{children}</div>
    </div>
  );
}

export default function AgentLayout({ children }: Props) {
  const params = useParams();
  const agentName = params.agentName as string;

  return (
    <AgentProvider agentName={agentName}>
      <AgentLayoutContent>{children}</AgentLayoutContent>
    </AgentProvider>
  );
}
