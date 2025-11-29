"use client";

import { ReactNode, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!data && !isPending) {
      router.replace("/login");
    }
  }, [data, isPending, router]);

  if (isPending || !data) {
    return null;
  }

  return (
    <>
      <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
    </>
  );
}
