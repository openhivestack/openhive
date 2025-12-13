import { validateAuth } from "@/lib/auth";
import { isRootUser } from "@/lib/auth/utils";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SubHeader, Tab } from "@/components/sub-header";

export default async function SystemLayout({ children }: { children: ReactNode }) {
  const authResult = await validateAuth();

  // 1. Authentication Check
  if (!authResult || !authResult.user) {
    redirect("/login");
  }

  // 2. Root Access Check
  if (!isRootUser(authResult.user)) {
    redirect("/"); // Strict redirect for non-root users
  }

  const tabs: Tab[] = [
    {
      label: "System",
      href: "/system",
      key: "system",
      icon: "layout-dashboard",
    },
    {
      label: "Verifications",
      href: "/system/verifications",
      key: "verifications",
      icon: "shield-check",
    },
  ];

  return (
    <div>
      <Header />
      <SubHeader tabs={tabs} />
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
}
