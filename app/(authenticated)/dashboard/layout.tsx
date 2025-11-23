'use client';

import { ReactNode } from "react";
import { Header } from "@/components/header";
import { SubHeader } from "@/components/sub-header";
import { usePathname } from "next/navigation";

export default function OverviewLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = pathname.split('/').pop();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SubHeader activeTab={activeTab} />

      <div className="container mx-auto px-4 py-8 max-w-10xl mt-4">
        {children}
      </div>
    </div>
  );
}