"use client";

import * as React from "react";
import {
  CircleQuestionMark,
  Settings2,
  SquareTerminal,
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

interface AppSidebarProps {
  tree: any;
}

export function AppSidebar({ tree, ...props }: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = {
    navMain: [
      {
        name: "My Agents",
        url: "/agent/list",
        isActive: pathname.startsWith("/agent/list") && searchParams.get("q") === null,
        icon: SquareTerminal,
      },
      {
        name: "Settings",
        url: "/settings",
        isActive: pathname.startsWith("/settings"),
        icon: Settings2,
      },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-start p-2">
          <Logo size="size-7" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocs tree={tree} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton className="text-sidebar-foreground/70">
          <Link
            href="https://docs.openhive.sh/docs/core/quick-start"
            target="_blank"
            className="flex items-center gap-2"
          >
            <CircleQuestionMark className="size-4" />
            <span className="text-sm font-medium">Help & First Steps</span>
          </Link>
        </SidebarMenuButton>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
