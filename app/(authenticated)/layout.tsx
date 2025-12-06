import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { validateAuth } from "@/lib/auth";
import { isRootUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { source } from "@/lib/source";

import { getComputedNavigation } from "@/lib/features";

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const result = await validateAuth();
  const user = result?.session?.user;

  if (!user) {
    redirect("/login");
  }

  const navItems = await getComputedNavigation();

  // Filter items based on scopes
  const filteredNavItems = navItems.filter(item => {
    if (!item.scopes || item.scopes.length === 0) return true;
    if (item.scopes.includes("root")) {
      return isRootUser(result.user);
    }
    return true;
  });

  return (
    <>
      <SidebarProvider>
        <AppSidebar tree={source.pageTree} navMain={filteredNavItems} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
