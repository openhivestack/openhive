import { validateAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await validateAuth();

  const user = result?.user;

  if (user) {
    return NextResponse.json({ user });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
