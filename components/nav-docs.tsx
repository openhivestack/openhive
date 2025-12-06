'use client';

import { type LucideIcon, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface NavDocsProps {
  tree: any;
}

export function NavDocs({
  tree,
}: NavDocsProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-muted-foreground/70">Get Started</SidebarGroupLabel>
      <SidebarMenu>
        {tree.children.map((item: any) => (
          <div key={item.name}>
            {item.type === 'separator' ? (
              <SidebarGroupLabel className="mt-4 text-muted-foreground/70">{item.name}</SidebarGroupLabel>
            ) : (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild className="hover:bg-transparent hover:text-primary text-foreground/80">
                  <Link href={item.url} className={pathname === item.url ? 'text-primary bg-primary/10' : ''}>
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </div>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}