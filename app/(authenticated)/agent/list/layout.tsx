"use client";

import { SubHeader } from "@/components/sub-header";
import { Header } from "@/components/header";
import { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BookLock, Home, SquareLibrary } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

export default function AgentsLayout({ children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q");

  const tabs = [
    {
      category: "Agents",
      description: "Manage your agents",
      items: [
        {
          label: "All",
          icon: Home,
          value: "all",
          pathname: "/agent/list",
        },
        {
          label: "Public",
          icon: SquareLibrary,
          value: "public",
          pathname: "/agent/list",
          query: "is:public",
        },
        {
          label: "Private",
          icon: BookLock,
          value: "private",
          pathname: "/agent/list",
          query: "is:private",
        },
      ],
    },
  ];

  const isActive = (itemPathname: string, itemQuery?: string) => {
    if (pathname !== itemPathname) {
      return false;
    }
    return (itemQuery || null) === currentQuery;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SubHeader activeTab={"agent"} />

      <div className="container mx-auto px-4 py-8 max-w-7xl mt-10">
        <div className="grid grid-cols-12 gap-18">
          <div className="col-span-3">
            <div className="mt-8">
              {tabs.map((tab, index) => (
                <div key={tab.category}>
                  <div className="text-sm font-bold text-primary">
                    {tab.category}
                  </div>
                  <div className="text-sm text-muted-foreground/50">
                    {tab.description}
                  </div>
                  <div className="mt-4 space-y-0.5 flex flex-col">
                    {tab.items.map((item) => {
                      const params = new URLSearchParams(
                        searchParams.toString()
                      );
                      if (item.query) {
                        params.set("q", item.query);
                      } else {
                        params.delete("q");
                      }
                      const queryString = params.toString();
                      const href = queryString
                        ? `${item.pathname}?${queryString}`
                        : item.pathname;
                      return (
                        <Link
                          key={item.value}
                          href={href}
                          className={cn(
                            "flex items-center gap-2 text-sm text-muted-foreground/90 hover:text-primary cursor-pointer hover:bg-accent rounded-md px-3 py-1.5",
                            isActive(item.pathname, item.query) &&
                              "bg-accent text-primary"
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
