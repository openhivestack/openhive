import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const searchParams = req.nextUrl.searchParams;
  const key = searchParams.get("key");
  const agentName = (await params).agentName;

  if (!key) {
    return NextResponse.json(
      { error: "Missing key parameter" },
      { status: 400 }
    );
  }

  // Basic validation to prevent directory traversal
  if (key.includes("..") || !key.startsWith("agents/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  // Ensure the key matches the agentName in the URL (security check)
  // key format: agents/{ownerId}/{agentName}/{version}.tar.gz
  const parts = key.split("/");
  if (parts.length < 3 || parts[2] !== agentName) {
    return NextResponse.json(
      { error: "Key does not match agent name in URL" },
      { status: 400 }
    );
  }

  const storagePath = process.env.STORAGE_PATH || "/var/lib/openhive/storage";
  const fullPath = path.join(storagePath, key);
  const dir = path.dirname(fullPath);

  try {
    await fs.mkdir(dir, { recursive: true });

    // Convert Web Stream to Node Stream
    // @ts-expect-error - allow generic ReadableStream to be passed
    const nodeStream = Readable.fromWeb(req.body as ReadableStream);
    const fileStream = createWriteStream(fullPath);

    await pipeline(nodeStream, fileStream);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
