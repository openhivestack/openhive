"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth/client";
import { DynamicIcon } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface NavMainProps {
  items: {
    name: string;
    url: string;
    icon: string;
    className?: string;
    isPublic?: boolean;
  }[];
}

export function NavMain({
  items,
}: NavMainProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          if (!item.isPublic && !session) {
            return null;
          }

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                className={cn(
                  "hover:bg-transparent",
                  item.className ? item.className : "hover:text-primary",
                  pathname.startsWith(item.url)
                    ? item.className
                      ? "opacity-100"
                      : "text-primary"
                    : "text-foreground/80"
                )}
              >
                <Link href={item.url}>
                  <DynamicIcon
                    name={item.icon as any}
                    className={cn(item.className)}
                  />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
