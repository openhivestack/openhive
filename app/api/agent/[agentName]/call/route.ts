import { NextRequest, NextResponse } from "next/server";
import { openhive } from "@/lib/model-providers/openhive";
import { convertToModelMessages, streamText } from "ai";
import { validateAuth } from "@/lib/auth";
import { globalRateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  const { agentName } = await params;

  if (!agentName || agentName === "undefined" || agentName === "null") {
    return NextResponse.json(
      { error: "Invalid agent name" },
      { status: 400 }
    );
  }

  // 1. Validate Auth (API Key or Session)
  const auth = await validateAuth();
  const userId = auth?.user?.id;
  const isGuest = !userId;

  // 2. Rate Limiting (Guest Only)
  if (isGuest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limit = globalRateLimiter.check(ip, 10); // 10 requests per minute

    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please log in for higher limits." },
        { status: 429 }
      );
    }
  }

  // 3. Resolve Agent URL
  const proxyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/agent/${agentName}`;

  try {
    const { messages, id: conversationId } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // 4. Persistence: Create/Update Conversation & Save User Message
    // Note: We perform this asynchronously effectively, but we await it to ensure consistency before streaming
    // Ideally we should do this in parallel with the stream start, but for simplicity we await.

    if (conversationId && lastMessage) {
      await prisma.conversation.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          agentName,
          userId: userId, // Null for guests
          isPublic: false,
        },
        update: {
          // If user logs in halfway, claim the guest conversation? 
          // For now, keep as is. If userId matches, good.
          updatedAt: new Date(),
        }
      });

      let contentToSave = lastMessage.content;
      if (!contentToSave && (lastMessage as any).parts) {
        contentToSave = (lastMessage as any).parts;
      }

      await prisma.message.create({
        data: {
          conversationId,
          role: lastMessage.role,
          content: contentToSave ?? "", // Handle undefined content safely
        }
      });
    }

    // 5. Forward Headers (Cookie)
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

    // 6. Stream Response via OpenHive Provider
    const result = streamText({
      model: openhive(proxyUrl, {
        headers: {
          ...headers,
          ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
        }
      }),
      messages: convertToModelMessages(messages),
      async onFinish(completion) {
        // Save Assistant Message
        if (conversationId) {
          await prisma.message.create({
            data: {
              conversationId,
              role: "assistant",
              content: completion.text,
              // We could save 'parts' if we had full structured output, but 'text' is safe for now
            }
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    // Graceful Error Handling
    const message = error.message || "";
    let status = 500;

    // Check for known status codes in message or error object
    if (message.includes("401") || message.includes("Unauthorized")) status = 401;
    else if (message.includes("403") || message.includes("Forbidden")) status = 403;
    else if (message.includes("404") || message.includes("not found")) status = 404;
    else if (message.includes("429") || message.includes("Too many requests")) status = 429;

    // Log based on severity
    if (status >= 500) {
      console.error(`[AgentCall] Error calling agent ${agentName}:`, error);
    } else {
      console.warn(`[AgentCall] Client error calling calling agent ${agentName}: ${status} - ${message}`);
    }

    return NextResponse.json(
      { error: "Failed to call agent", details: message },
      { status }
    );
  }
}
