"use client";

import { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import { Bolt, Braces, LucideIcon } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

interface Tab {
  category: string;
  description: string;
  items: {
    label: string;
    icon: LucideIcon;
    value: string;
    pathname: string;
  }[];
  hidden?: boolean;
}

export default function SettingsLayout({ children }: Props) {
  const pathname = usePathname();
  const params = useParams();
  const agentName = params.agentName as string;

  const tabs: Tab[] = [
    {
      category: "Agent Settings",
      description: "Configure your agent settings",
      items: [
        {
          label: "General",
          icon: Bolt,
          value: "general",
          pathname: `/agent/${agentName}/settings`,
        },
        {
          label: "Environment Variables",
          icon: Braces,
          value: "environment-variables",
          pathname: `/agent/${agentName}/settings/environment-variables`,
        },
      ],
    },
  ];

  const isActive = (itemPathname: string) => {
    if (pathname !== itemPathname) {
      return false;
    }
    return true;
  };

  return (
    <div className="grid grid-cols-12 gap-18 py-4 px-6">
      <div className="col-span-3">
        <div className="mt-8">
          {tabs.map((tab, index) => (
            <div key={tab.category}>
              {!tab.hidden && (
                <div className="text-sm font-bold text-primary">
                  {tab.category}
                </div>
              )}
              {!tab.hidden && (
                <div className="text-sm text-muted-foreground/50">
                  {tab.description}
                </div>
              )}
              <div className="mt-4 space-y-0.5 flex flex-col">
                {tab.items.map((item) => {
                  const href = item.pathname;
                  return (
                    <Link
                      key={item.value}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 text-sm text-muted-foreground/90 hover:text-primary cursor-pointer hover:bg-accent rounded-md px-3 py-1.5",
                        isActive(item.pathname) && "bg-accent text-primary"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}

                {index < tabs.length - 1 && <Separator className="my-2.5" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-9">{children}</div>
    </div>
  );
}
