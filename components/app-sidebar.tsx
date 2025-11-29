"use client";

import * as React from "react";
import {
  BookOpen,
  CircleQuestionMark,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavStarred } from "@/components/nav-starred";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = {
    navMain: [
      {
        title: "Agents",
        url: "#",
        icon: SquareTerminal,
        isActive: pathname.startsWith("/agent/list"),
        items: [
          {
            title: "All",
            url: "/agent/list",
            isActive: pathname.startsWith("/agent/list") && searchParams.get("q") === null,
          },
          {
            title: "Public",
            url: "/agent/list?q=is%3Apublic",
            isActive: searchParams.get("q") === "is:public",
          },
          {
            title: "Private",
            url: "/agent/list?q=is%3Aprivate",
            isActive: searchParams.get("q") === "is:private",
          },
        ],
      },
      {
        title: "Documentation",
        url: "https://docs.openhive.sh/docs",
        icon: BookOpen,
        items: [
          {
            title: "Introduction",
            url: "https://docs.openhive.sh/docs",
          },
          {
            title: "Quick Start",
            url: "https://docs.openhive.sh/docs/guides/quickstart",
          },
          {
            title: "Registry",
            url: "https://docs.openhive.sh/docs/concepts/registry",
          },
          {
            title: "Tutorials",
            url: "https://docs.openhive.sh/docs/tutorials/first-agent",
          },
        ],
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
        items: [
          {
            title: "General",
            url: "/settings/general",
            isActive: pathname.startsWith("/settings/general"),
          },
          {
            title: "API Keys",
            url: "/settings/api-keys",
            isActive: pathname.startsWith("/settings/api-keys"),
          },
        ],
      },
    ],
    starredAgents: [],
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
        <NavStarred agents={data.starredAgents} />
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
