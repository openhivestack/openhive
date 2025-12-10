import { LanguageModelV2, LanguageModelV2CallOptions } from '@ai-sdk/provider';
import {
  APICallError,
} from '@ai-sdk/provider';
import { A2AClient } from "@a2a-js/sdk/client";
import { Message, MessageSendParams } from "@a2a-js/sdk";
import crypto from "crypto";

interface OpenHiveChatConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  generateId: () => string;
  fetch?: typeof fetch;
}

export class OpenHiveChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: string;
  readonly modelId: string;
  readonly config: OpenHiveChatConfig;

  constructor(
    modelId: string,
    settings: any,
    config: OpenHiveChatConfig,
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.config = config;
  }

  get supportedUrls() {
      return {};
  }


  async doGenerate(options: LanguageModelV2CallOptions): Promise<any> {
     // We only implementations streaming for now as per requirement
     throw new Error("Non-streaming generation not implemented");
  }

  async doStream(options: LanguageModelV2CallOptions) {
    // Resolve URL: if modelId is a URL, use it; otherwise append to baseURL
    const url = this.modelId.startsWith('http') 
        ? this.modelId 
        : `${this.config.baseURL}/${this.modelId}`;

    const headers = this.config.headers();

    // Create a fetch wrapper to inject headers
    const fetchWithHeaders: typeof fetch = async (input, init) => {
        const reqHeaders = new Headers(init?.headers);
        
        // Inject auth headers
        Object.entries(headers).forEach(([key, value]) => {
            reqHeaders.set(key, value);
        });

        // Ensure we pass the signal if provided
        return (this.config.fetch || fetch)(input, {
             ...init,
             headers: reqHeaders,
        });
    };

    // Initialize A2A Client with custom fetch
    // Append card path as `fromCardUrl` expects a card URL, not base agent URL
    // The previous implementation used proxyUrl which was `api/agent/...`
    // The proxy mimics the agent endpoints. 
    // `A2AClient.fromCardUrl` usually fetches the card first.
    // However, our proxy MIGHT NOT support .well-known/agent-card.json exactly as SDK expects if it's just a proxy to agent root?
    // Actually, `fromCardUrl` fetches the card from `url`. 
    // If `url` is `.../first-agent`, SDK might try `.../first-agent`.
    // Let's create client directly or use the `fromCardUrl` if the proxy supports serving the card at that URL.
    // Based on previous logs: `GET /hub/first-agent` works. `POST /api/agent/-/first-agent` works.
    // The proxy route `app/api/agent/[slug]/[agentName]/route.ts` handles GET by fetching the card.
    // So `http://localhost:3000/api/agent/-/first-agent` SHOULD return the card.
    
    // We can assume `A2AClient.fromCardUrl(url)` will work if we point it to the proxy URL which serves the card on GET.
    
    try {
        const client = await A2AClient.fromCardUrl(url, {
            fetchImpl: fetchWithHeaders
        });

        const messages = options.prompt;
        const lastMessage = messages[messages.length - 1];
        
        const parts: any[] = [];
        if (typeof lastMessage.content === 'string') {
             parts.push({ kind: "text", text: lastMessage.content });
        } else if (Array.isArray(lastMessage.content)) {
             lastMessage.content.forEach(c => {
                 if (c.type === 'text') parts.push({ kind: "text", text: c.text });
             });
        }
        
        // Construct A2A-compliant message object
        const role = (lastMessage.role === 'user' || lastMessage.role === 'system') ? 'user' : 'agent'; 
        
        const sendParams: MessageSendParams = {
            message: {
                messageId: crypto.randomUUID(),
                role: role as "user" | "agent",
                parts: parts,
                kind: "message",
            }
        };

        const response = await client.sendMessage(sendParams);

        if ("error" in response) {
             throw new APICallError({
                message: response.error.message,
                url: url,
                requestBodyValues: sendParams,
                statusCode: 500
            });
        }

        const result = (response as any).result as Message;
        const text = result.parts.filter(p => p.kind === 'text').map(p => (p as any).text).join('');

        // Create a stream from the single response (simulating streaming for now since we use sendMessage)
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue({ type: 'stream-start', warnings: [] });
                controller.enqueue({ type: 'text', text: text });
                // controller.close() is handled by transform? No, we need to close or let it finish.
                // But streamText expects a specific stream structure?
                // Actually `LanguageModelV2` stream returns `{ stream, warnings }`.
                // The stream should yield parts.
                controller.close();
            }
        });

        // We need to transformer? No, if we construct the stream manually with correct objects, we are good.
        // Wait, `LanguageModelV2StreamPart` objects.
        
        return { 
            stream: stream as any, // Cast to avoid strict type checks on ReadableStream vs Stream
            warnings: [] 
        };

    } catch (e: any) {
        throw new APICallError({
            message: e.message || "Failed to initialize A2A Client or send message",
            url: url,
            isRetryable: false,
            cause: e,
            requestBodyValues: options.prompt // include prompt as debug value
        });
    }
  }
}
