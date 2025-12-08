import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { source } from "@/lib/source";

import { validateAuth } from "@/lib/auth";
import { getFilteredNavigation } from "@/lib/features";

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const result = await validateAuth();
  const navItems = await getFilteredNavigation(result?.user);

  return (
    <>
      <SidebarProvider>
        <AppSidebar tree={source.pageTree} navMain={navItems} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
