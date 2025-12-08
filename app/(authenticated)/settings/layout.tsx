"use client";

import { ReactNode } from "react";
import { SubHeader, Tab } from "@/components/sub-header";
import { Home, Terminal, Building2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";

interface Props {
  children: ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  const pathname = usePathname();
  const activeTab = pathname.split("/").pop();

  const tabs: Tab[] = [
    {
      label: "General",
      href: `/settings`,
      key: "general",
      icon: Home,
    },
    {
      label: "API Keys",
      href: `/settings/api-keys`,
      key: "api-keys",
      icon: Terminal,
    },
  ];

  return (
    <div>
      <Header />
      <SubHeader activeTab={activeTab === 'settings' ? 'general' : activeTab} tabs={tabs} />

      <div>
        {children}
      </div>
    </div>
  );
}
