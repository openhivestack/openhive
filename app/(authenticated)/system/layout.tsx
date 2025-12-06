import { validateAuth } from "@/lib/auth";
import { isRootUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { SystemLayoutClient } from "./client-layout";

export default async function SystemLayout({ children }: { children: ReactNode }) {
  const authResult = await validateAuth();

  // 1. Authentication Check
  if (!authResult || !authResult.user) {
    redirect("/login");
  }

  // 2. Root Access Check
  if (!isRootUser(authResult.user)) {
    redirect("/"); // Strict redirect for non-root users
  }

  return (
    <SystemLayoutClient>
      {children}
    </SystemLayoutClient>
  );
}
