import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { validateAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { source } from "@/lib/source";

import { getNavConfig } from "@/lib/navigation";

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const result = await validateAuth();
  const user = result?.session?.user;

  if (!user) {
    redirect("/login");
  }

  const navConfig = await getNavConfig();

  return (
    <>
      <SidebarProvider>
        <AppSidebar tree={source.pageTree} navMain={navConfig.navMain} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
