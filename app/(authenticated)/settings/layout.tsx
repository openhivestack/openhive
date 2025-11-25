"use client";

import { SubHeader } from "@/components/sub-header";
import { Header } from "@/components/header";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CogIcon, KeyIcon } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  const pathname = usePathname();

  const tabs = [
    {
      category: "General",
      description: "Manage your general settings",
      hidden: true,
      items: [
        {
          label: "Account",
          icon: CogIcon,
          value: "account",
          pathname: "/settings/account",
        },
      ],
    },
    {
      category: "Developer",
      description: "Manage your developer settings",
      items: [
        {
          label: "API Keys",
          icon: KeyIcon,
          value: "api-keys",
          pathname: "/settings/api-keys",
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
    <div className="min-h-screen bg-background">
      <Header />
      <SubHeader activeTab={"settings"} />

      <div className="container mx-auto px-4 py-8 max-w-7xl mt-10">
        <div className="grid grid-cols-12 gap-18">
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

                    {index < tabs.length - 1 && (
                      <Separator className="my-2.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
