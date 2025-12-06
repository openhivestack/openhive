"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";
import { NavItem } from "@/lib/features";
import { usePathname } from "next/navigation";

export function HomeNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.url);

  return (
    <Link href={item.url}>
      <Button
        variant="link"
        className={cn(
          item.className ? item.className : "hover:text-primary",
          isActive
            ? item.className
              ? "opacity-100"
              : "text-primary"
            : "text-foreground/80"
        )}
      >
        <DynamicIcon
          name={item.icon as any}
          className={cn("size-4", item.className)}
        />
        {item.name}
      </Button>
    </Link>
  );
}
