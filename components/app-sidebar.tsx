"use client";

import * as React from "react";
import {
  SquareTerminal,
  Settings2,
  ShieldAlert,
  LucideIcon,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { usePathname, useSearchParams } from "next/navigation";
import { NavDocs } from "./nav-docs";

const iconMap: Record<string, LucideIcon> = {
  "square-terminal": SquareTerminal,
  "settings-2": Settings2,
  "shield-alert": ShieldAlert,
};

interface AppSidebarProps {
  tree: any;
  navMain: {
    name: string;
    url: string;
    icon: string;
    isActive?: boolean;
  }[];
}

export function AppSidebar({ tree, navMain, ...props }: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Process items to add isActive state and map icons
  const processedNavMain = navMain.map((item) => ({
    ...item,
    icon: iconMap[item.icon] || SquareTerminal, // Fallback icon
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
            href="https://docs.openhive.sh/docs/core/quick-start"
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
