"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  CircleQuestionMark,
  Code,
  Bot,
  Network,
  Dna,
  Unplug,
  BarChart3,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubHeaderProps {
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean; // Optional prop to control sticky behavior
  activeTab?: string;
  tabs?: Tab[];
}

export interface Tab {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  hidden?: boolean;
}

const defaultTabs: Tab[] = [
  { label: "Agents", href: "/agent/list", key: "agent", icon: Bot },
  {
    label: "Settings",
    href: "/settings",
    key: "settings",
    icon: Settings,
  },
];

export function SubHeader({
  children,
  className,
  sticky = false,
  activeTab,
  tabs = defaultTabs,
}: SubHeaderProps) {
  const router = useRouter();

  const handleTabClick = (tab: Tab) => (e: any) => {
    e.preventDefault();
    router.push(tab.href);
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between px-4 pt-3 bg-background border-b border-border",
        sticky && "sticky top-12 z-40", // Stick below the header (h-12) with proper z-index
        className
      )}
    >
      {tabs && (
        <div className="flex items-start gap-1">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={handleTabClick(tab)}
              className={cn(
                "flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors border-b-2 border-transparent py-1",
                activeTab?.toLowerCase() === tab.key.toLowerCase() &&
                  "border-primary text-primary"
              )}
            >
              {tab.disabled && !tab.hidden && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "!px-4",
                        "text-muted-foreground/70 hover:bg-transparent hover:text-muted-foreground/70 cursor-not-allowed"
                      )}
                      onClick={(e) => e.preventDefault()}
                    >
                      {tab.icon && <tab.icon className="w-4 h-4" />}
                      {tab.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>coming soon</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!tab.disabled && !tab.hidden && (
                <div
                  onClick={handleTabClick(tab)}
                  className={cn(
                    '!px-4 cursor-pointer flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent rounded-sm px-2 transition-colors py-1',
                    activeTab?.toLowerCase() === tab.key.toLowerCase() &&
                      'text-primary'
                  )}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
