"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SubHeader, Tab } from "@/components/sub-header";
import { Building2, Users, Settings, Briefcase } from "lucide-react";
import { usePathname } from "next/navigation";

export default function OrganizationLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Simple logic to find active tab, can be refined if tabs have sub-routes
  const activeTab = pathname.split("/").pop() === "organization" ? "overview" : pathname.split("/").pop();

  const tabs: Tab[] = [
    {
      label: "Overview",
      href: "/organization",
      key: "overview",
      icon: Building2,
    },
    {
      label: "Members",
      href: "/organization/members",
      key: "members",
      icon: Users,
    },
    {
      label: "Teams",
      href: "/organization/team",
      key: "team",
      icon: Briefcase,
    },
    {
      label: "Settings",
      href: "/organization/settings",
      key: "settings",
      icon: Settings,
    },
  ];

  return (
    <div>
      <Header />
      <SubHeader activeTab={activeTab || 'overview'} tabs={tabs} />
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
}
