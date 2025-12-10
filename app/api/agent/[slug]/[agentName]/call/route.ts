import { NextRequest, NextResponse } from "next/server";
import { openhive } from "@/lib/openhive-provider";
import { convertToModelMessages, streamText } from "ai";
import { validateAuth } from "@/lib/auth";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; agentName: string }> }
) {
  const { slug, agentName } = await params;
  
  // 1. Validate Auth (API Key or Session)
  const auth = await validateAuth();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resolve Agent URL
  // We use the OpenHive proxy URL to leverage existing logic for resolving internal/external agents.
  // The proxy is available at /api/agent/[slug]/[agentName].
  const proxyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/agent/${slug}/${agentName}`;

  try {
    const { messages } = await req.json();

    // 3. Forward Headers (Cookie)
    // We need to forward the cookie so the proxy knows who the user is.
    const cookieHeader = req.headers.get("cookie");
    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    // Forward other critical validation headers for Better-Auth
    const host = req.headers.get("host");
    if (host) headers["Host"] = host;

    const origin = req.headers.get("origin");
    if (origin) headers["Origin"] = origin;

    const referer = req.headers.get("referer");
    if (referer) headers["Referer"] = referer;

    const userAgent = req.headers.get("user-agent");
    if (userAgent) headers["User-Agent"] = userAgent;

    const forwardFor = req.headers.get("x-forwarded-for");
    if (forwardFor) headers["X-Forwarded-For"] = forwardFor;

    // 4. Stream Response via OpenHive Provider
    const result = streamText({
      model: openhive(proxyUrl, {
        headers
      }),
      messages: convertToModelMessages(messages),
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error(`[Agent Call] Error calling agent ${slug}/${agentName}:`, error);
    return NextResponse.json(
      { error: "Failed to call agent", details: error.message },
      { status: 500 }
    );
  }
}
