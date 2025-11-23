"use client";

import * as React from "react";
import { ChevronRight, Search, SlashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/user-profile";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import {
  Breadcrumb,
  BreadcrumbSeparator,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
} from "./ui/breadcrumb";
import { useRouter } from "next/navigation";

interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
  breadcrumbs?: {
    label: string;
    href: string;
    active?: boolean;
  }[];
}

export const Header = ({ className, children, breadcrumbs }: HeaderProps) => {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex w-full h-12 items-center justify-between px-4">
        {/* Left section - Logo and Navigation */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="size-7" />
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Breadcrumb>
              <BreadcrumbList className="!gap-0">
                {breadcrumbs?.map((breadcrumb, index) => (
                  <div
                    key={breadcrumb.href}
                    className="flex items-center gap-0"
                  >
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(breadcrumb.href)}
                          className={cn(
                            'px-2 hover:bg-transparent',
                            breadcrumb.active && "text-primary hover:text-primary"
                          )}
                        >
                          {breadcrumb.label}
                        </Button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator className="px-0.5">
                        <SlashIcon className="size-2" />
                      </BreadcrumbSeparator>
                    )}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Right section - Actions and User */}
        <div className="flex items-center gap-2">
          {children}

          {/* Search */}
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent transition-colors text-foreground"
                asChild
              >
                <div>
                  <Search className="size-5 text-muted-foreground" />
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search</p>
            </TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <AnimatedThemeToggler variant="ghost" size="icon" />

          {/* User menu */}
          <UserProfile />
        </div>
      </div>
    </header>
  );
};
