"use client";

import { type LucideIcon, Star } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import {
  Empty,
  EmptyTitle,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "./ui/empty";

export function NavStarred({
  agents,
}: {
  agents: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Starred</SidebarGroupLabel>
      <SidebarMenu>
        {agents.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {agents.length === 0 && (
          <Empty className="!p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-6 mb-0">
                <Star className="size-4" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-medium">
                No Starred Agents Yet
              </EmptyTitle>
              <EmptyDescription className="text-xs text-muted-foreground">
                You haven&apos;t starred any agents yet. Star an agent to
                quickly access it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
