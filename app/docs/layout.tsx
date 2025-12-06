import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { Suspense, type ReactNode } from "react";
import { baseOptions } from "../layout.config";
import { source } from "@/lib/source";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getComputedNavigation } from "@/lib/features";

export default async function Layout({ children }: { children: ReactNode }) {
  const navItems = await getComputedNavigation();
  return (
    <SidebarProvider>
      <SidebarInset>
        <DocsLayout
          tree={source.pageTree}
          {...baseOptions}
          sidebar={{
            collapsible: false,
            component: (
              <Suspense>
                <AppSidebar tree={source.pageTree} navMain={navItems} />
              </Suspense>
            ),
          }}
        >
          {children}
        </DocsLayout>
      </SidebarInset>
    </SidebarProvider>
  );
}
