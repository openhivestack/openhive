import { NextRequest, NextResponse } from "next/server";
import { cloudService } from "@/lib/cloud.service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface AgentPathParams {
  params: Promise<{ agentName: string; path?: string[] }>;
}

// Route: /api/agent/[agentName]/[...path]
// Acts as a proxy to the deployed agent
export async function GET(req: NextRequest, params: AgentPathParams) {
  return handleProxy(req, params);
}

export async function POST(req: NextRequest, params: AgentPathParams) {
  return handleProxy(req, params);
}

export async function PUT(req: NextRequest, params: AgentPathParams) {
  return handleProxy(req, params);
}

export async function DELETE(req: NextRequest, params: AgentPathParams) {
  return handleProxy(req, params);
}

async function handleProxy(req: NextRequest, { params }: AgentPathParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { agentName, path } = await params;
  const gatewaySecret = process.env.GATEWAY_SECRET;

  if (!gatewaySecret) {
    console.error("GATEWAY_SECRET is not configured");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  // 1. Resolve Target URL
  // Returns e.g. https://proxy-dev.openhive.sh/agent-name
  const baseUrl = cloudService.getAgentInternalUrl(agentName);

  // Construct full path: baseUrl + / + joined path + query string
  const pathString = path ? path.join("/") : "";
  const searchParams = req.nextUrl.search; // includes '?'
  const targetUrl = `${baseUrl}/${pathString}${searchParams}`;

  console.log(`Proxying request to: ${targetUrl}`);

  try {
    // 2. Forward Request
    const headers = new Headers(req.headers);

    // Add Authentication for the Sidecar Proxy
    headers.set("x-openhive-gateway-secret", gatewaySecret);

    // Clean up headers that might confuse the upstream (like host)
    headers.delete("host");

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body, // Streams body directly
      // @ts-expect-error - duplex is required for streaming bodies in Node/Edge
      duplex: "half",
    });

    // 3. Return Standard Response
    // Create a new response with the upstream body and headers
    const responseHeaders = new Headers(response.headers);

    // 4. Handle Agent Card Interception
    // If this is a request for the agent card, we must rewrite the URL
    // to point to the platform proxy instead of the internal/local URL.
    if (pathString === ".well-known/agent-card.json" && response.ok) {
      const card = await response.json();

      // Rewrite URL to point to this API route
      const platformAgentUrl = `${req.nextUrl.origin}/api/agent/${agentName}`;
      card.url = platformAgentUrl;

      // Remove Content-Length because we modified the body size
      responseHeaders.delete("content-length");

      return NextResponse.json(card, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error for ${agentName}:`, error);
    return NextResponse.json(
      { error: "Bad Gateway", details: "Failed to reach agent" },
      { status: 502 }
    );
  }
}
