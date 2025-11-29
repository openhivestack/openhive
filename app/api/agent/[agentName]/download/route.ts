import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";

export async function GET(
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

  // Ensure the key matches the agentName in the URL
  const parts = key.split("/");
  if (parts.length < 3 || parts[2] !== agentName) {
    return NextResponse.json(
      { error: "Key does not match agent name in URL" },
      { status: 400 }
    );
  }

  const storagePath = process.env.STORAGE_PATH || "/var/lib/openhive/storage";
  const fullPath = path.join(storagePath, key);

  try {
    // Check if file exists
    await fs.access(fullPath);

    // Create read stream
    const fileStream = fsSync.createReadStream(fullPath);

    // Create a Web ReadableStream from the Node.js stream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${path.basename(key)}"`,
      },
    });
  } catch (error) {
    console.error("Download failed:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
