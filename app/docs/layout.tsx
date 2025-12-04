import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { Suspense, type ReactNode } from "react";
import { baseOptions } from "../layout.config";
import { source } from "@/lib/source";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: ReactNode }) {
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
                <AppSidebar tree={source.pageTree} />
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
