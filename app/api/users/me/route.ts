import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  if (user) {
    return NextResponse.json({ user });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
