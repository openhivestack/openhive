"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  return (
    <RootProvider
      theme={{
        defaultTheme: "system",
        attribute: "class",
      }}
    >
      {children}
      <Toaster richColors expand />
    </RootProvider>
  );
}
