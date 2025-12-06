"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { usePathname, useSearchParams } from "next/navigation";
import { NavDocs } from "./nav-docs";

interface AppSidebarProps {
  tree: any;
  navMain: {
    name: string;
    url: string;
    icon: string;
    className?: string;
    isActive?: boolean;
  }[];
}

export function AppSidebar({ tree, navMain, ...props }: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Process items to add isActive state and map icons
  const processedNavMain = navMain.map((item) => ({
    ...item,
    icon: item.icon || 'square-terminal', // Fallback icon
    className: item.className || '',
    isActive: item.isActive ?? (pathname.startsWith(item.url) && (item.url !== "/agent/list" || searchParams.get("q") === null)),
  }));


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-start p-2">
          <Logo size="size-7" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={processedNavMain} />
        <NavDocs tree={tree} />
      </SidebarContent>
      <SidebarFooter>
        {/* <SidebarMenuButton className="text-sidebar-foreground/70">
          <Link
            href="https://docs.openhive.cloud/docs/core/quick-start"
            target="_blank"
            className="flex items-center gap-2"
          >
            <CircleQuestionMark className="size-4" />
            <span className="text-sm font-medium">Help & First Steps</span>
          </Link>
        </SidebarMenuButton> */}
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
