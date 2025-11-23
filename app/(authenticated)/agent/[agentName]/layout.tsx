"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SubHeader, Tab } from "@/components/sub-header";
import { Home, Terminal } from "lucide-react";
import { useParams, usePathname } from "next/navigation";

interface Props {
  children: ReactNode;
}

export default function AgentLayout({ children }: Props) {
  const params = useParams();
  const agentName = params.agentName as string;
  const pathname = usePathname();
  const activeTab = pathname.split('/').pop();

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
  ];

  return (
    <div>
      <Header
        breadcrumbs={[
          { label: "agents", href: "/agent/list" },
          { label: agentName, href: `/agent/${agentName}`, active: true },
        ]}
      />
      <SubHeader activeTab={activeTab} tabs={tabs} />

      <div className="container mx-auto px-4 py-4 max-w-7xl mt-2">
        {children}
      </div>
    </div>
  );
}
