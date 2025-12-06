"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/user-profile";
import {
  AnimatedThemeToggler } from "./ui/animated-theme-toggler";

interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export const Header = ({ className, children }: HeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2",
        className
      )}
    >
      <div className={cn("flex w-full h-12 items-center px-4 gap-2 justify-end", children && "justify-between")}>
        {children}

        {/* Right section - Actions and User */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <AnimatedThemeToggler variant="ghost" size="icon" />

          {/* User menu */}
          <UserProfile showText />
        </div>
      </div>
    </header>
  );
};
