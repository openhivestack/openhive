import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { source } from "@/lib/source";

import { getComputedNavigation } from "@/lib/features";

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const navItems = await getComputedNavigation();

  return (
    <>
      <SidebarProvider>
        <AppSidebar tree={source.pageTree} navMain={navItems} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
