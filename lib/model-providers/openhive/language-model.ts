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


    async doGenerate(options: LanguageModelV2CallOptions) {
        const url = this.modelId.startsWith('http')
            ? this.modelId
            : `${this.config.baseURL}/${this.modelId}`;

        const headers = this.config.headers();

        const fetchWithHeaders: typeof fetch = async (input, init) => {
            const reqHeaders = new Headers(init?.headers);
            Object.entries(headers).forEach(([key, value]) => {
                reqHeaders.set(key, value);
            });
            return (this.config.fetch || fetch)(input, {
                ...init,
                headers: reqHeaders,
            });
        };

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

            const role = (lastMessage.role === 'user' || lastMessage.role === 'system') ? 'user' : 'agent';

            const contextId = headers["X-Conversation-Id"] || headers["x-conversation-id"];

            const sendParams: MessageSendParams = {
                message: {
                    messageId: crypto.randomUUID(),
                    role: role as "user" | "agent",
                    parts: parts,
                    kind: "message",
                    contextId: contextId,
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

            const result = (response as any).result;

            let text = "";

            if (result.kind === 'message' && Array.isArray(result.parts)) {
                text = result.parts.filter((p: any) => p.kind === 'text').map((p: any) => p.text).join('');
            } else if (result.kind === 'task') {
                // If task, checking artifacts first for output
                if (Array.isArray(result.artifacts)) {
                    text = result.artifacts.map((a: any) =>
                        a.parts?.filter((p: any) => p.kind === 'text').map((p: any) => p.text).join('\n')
                    ).filter(Boolean).join('\n\n');
                }

                // Also check history for assistant messages if artifacts are empty or supplementary
                if (Array.isArray(result.history)) {
                    const historyText = result.history
                        .filter((m: any) => m.role === 'assistant' || m.role === 'agent')
                        .map((m: any) => m.parts?.filter((p: any) => p.kind === 'text').map((p: any) => p.text).join(''))
                        .filter(Boolean)
                        .join('\n\n');

                    if (historyText) {
                        text = text ? `${text}\n\n${historyText}` : historyText;
                    }
                }

                if (!text && result.status?.state === 'failed') {
                    // If failed and no output, try to find an error message or just state it failed
                    text = `Task failed with status: ${result.status?.state}. ${result.status?.reason || ''}`;
                }
            }

            return {
                content: [{ type: 'text' as const, text }],
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    // V2 strict requirements
                    inputTokens: 0,
                    outputTokens: 0,
                },
                finishReason: 'stop' as const,
                warnings: []
            };

        } catch (e: any) {
            throw new APICallError({
                message: e.message || "Failed to initialize A2A Client or send message",
                url: url,
                isRetryable: false,
                cause: e,
                requestBodyValues: options.prompt
            });
        }
    }

    async doStream(options: LanguageModelV2CallOptions) {
        // Reuse doGenerate to get the full response, then stream it
        const result = await this.doGenerate(options);

        const stream = new ReadableStream({
            start(controller) {
                result.content.forEach((part: any) => {
                    if (part.type === 'text') {
                        const partId = crypto.randomUUID();
                        controller.enqueue({ type: 'text-start', id: partId });
                        controller.enqueue({ type: 'text-delta', id: partId, delta: part.text });
                        controller.enqueue({ type: 'text-end', id: partId });
                    }
                });

                controller.enqueue({
                    type: 'finish',
                    finishReason: result.finishReason,
                    usage: result.usage,
                });

                controller.close();
            }
        });

        return {
            stream: stream as any,
            warnings: result.warnings
        };
    }
}
