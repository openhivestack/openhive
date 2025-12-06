"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SubHeader, Tab } from "@/components/sub-header";
import { ShieldCheck, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";

export function SystemLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Simple check for active tab.
  const activeTab = pathname.includes("/verifications") ? "verifications" : "system";

  const tabs: Tab[] = [
    {
      label: "System",
      href: "/system",
      key: "system",
      icon: LayoutDashboard,
    },
    {
      label: "Verifications",
      href: "/system/verifications",
      key: "verifications",
      icon: ShieldCheck,
    },
  ];

  return (
    <div>
      <Header />
      <SubHeader activeTab={activeTab} tabs={tabs} />
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
}
