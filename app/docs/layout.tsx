import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { Suspense, type ReactNode } from "react";
import { baseOptions } from "../layout.config";
import { source } from "@/lib/source";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getFilteredNavigation } from "@/lib/features";
import { validateAuth } from "@/lib/auth";

export default async function Layout({ children }: { children: ReactNode }) {
  const result = await validateAuth();
  const navItems = await getFilteredNavigation(result?.user);
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
