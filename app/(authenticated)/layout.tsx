import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { validateAuth } from "@/lib/auth";
import { isRootUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { source } from "@/lib/source";

import { getFilteredNavigation } from "@/lib/features";

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const result = await validateAuth();
  const user = result?.session?.user;

  if (!user) {
    redirect("/login");
  }

  const filteredNavItems = await getFilteredNavigation(user);

  return (
    <>
      <SidebarProvider>
        <AppSidebar tree={source.pageTree} navMain={filteredNavItems} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
