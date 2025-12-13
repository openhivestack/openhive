"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function inviteMember(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const organizationId = formData.get("organizationId") as string;

  if (!email || !role || !organizationId) {
    throw new Error("Missing required fields");
  }

  // Use Better-Auth API to send invitation
  // Note: auth.api.inviteMember might send an email if configured, or just create DB record.
  // We need to check exact API signature for the plugin.
  // Usually it is: auth.api.createInvitation({ body: { email, role, organizationId }, headers })

  try {
    await auth.api.createInvitation({
      body: {
        email,
        role: role as "member" | "admin" | "owner",
        organizationId
      },
      headers: await headers()
    });

    revalidatePath("/organization/members");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to invite member:", error);
    throw new Error(error.message || "Failed to invite member");
  }
}
