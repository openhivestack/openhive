"use client";

import { AgentDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Activity,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  GlobeIcon,
  MicIcon,
  Lock,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { DateTime } from "luxon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { authClient, useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "./ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageBranch,
  MessageBranchContent,
  MessageResponse
} from "./ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  PromptInputProvider,
} from "./ai-elements/prompt-input";

import { Suggestion, Suggestions } from "./ai-elements/suggestion";

interface AgentPublicPageProps {
  agent: AgentDetail;
}

function toPascalCase(str: string): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/[\s-_]+/g, '');
}

function generateNodeScaffold(agentName: string, agentUrl: string) {
  const className = toPascalCase(agentName);
  return `import { A2AClient } from "@a2a-js/sdk/client";
import { MessageSendParams, Message } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

/**
 * Client for interacting with the ${agentName} agent.
 * Deployed at: ${agentUrl || 'UNKNOWN'}
 */
export class ${className} {
  private client!: A2AClient;
  private agentUrl: string;

  constructor(agentUrl?: string) {
    this.agentUrl = agentUrl || "${agentUrl || ''}";
    if (!this.agentUrl) {
        throw new Error("Agent URL is required");
    }
  }

  async init() {
    const cardUrl = this.agentUrl.replace(/\\/+$/, "") + "/.well-known/agent-card.json";
    this.client = await A2AClient.fromCardUrl(cardUrl);
  }

  /**
   * Sends a message to the agent.
   * @param text The text message to send
   */
  async sendMessage(text: string): Promise<Message> {
    if (!this.client) await this.init();

    const params: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text }],
        kind: "message",
      },
    };

    const response = await this.client.sendMessage(params);

    if ("error" in response) {
      throw new Error(response.error.message);
    }

    return (response as any).result as Message;
  }
}`;
}

function generatePythonScaffold(agentName: string, agentUrl: string) {
  const className = toPascalCase(agentName);
  return `import uuid
from a2a_sdk.client import A2AClient
from a2a_sdk.types import Message, MessageSendParams, MessagePart

class ${className}:
    """
    Client for interacting with the ${agentName} agent.
    Deployed at: ${agentUrl || 'UNKNOWN'}
    """
    def __init__(self, agent_url: str = "${agentUrl || ''}"):
        if not agent_url:
            raise ValueError("Agent URL is required")
        self.agent_url = agent_url
        self.client = None

    async def init(self):
        card_url = f"{self.agent_url.rstrip('/')}/.well-known/agent-card.json"
        self.client = await A2AClient.from_card_url(card_url)

    async def send_message(self, text: str) -> Message:
        if not self.client:
            await self.init()

        params = MessageSendParams(
            message=Message(
                message_id=str(uuid.uuid4()),
                role="user",
                parts=[MessagePart(kind="text", text=text)],
                kind="message"
            )
        )

        response = await self.client.send_message(params)
        
        if hasattr(response, 'error'):
             raise Exception(response.error.message)
             
        return response.result`;
}

interface CollapsibleCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

function CollapsibleCodeBlock({ code, language = "typescript", className }: CollapsibleCodeBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800", className)}>
      <div className={cn(
        "relative overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "h-auto" : "h-[300px]"
      )}>
        <div className="absolute right-4 top-4 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-50"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="overflow-x-auto text-sm">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              background: 'transparent', // Use container background
            }}
            codeTagProps={{
              style: {
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }
            }}
            wrapLines={false} // Usually cleaner for code blocks to scroll horizontally
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>

      {!expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950/90 to-transparent pointer-events-none" />
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 shadow-sm text-xs font-medium bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" />
              Collapse Code
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              Expand Code
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function AgentPublicPage({ agent }: AgentPublicPageProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State for UI toggles (visual only for now, or future implementation)
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);

  const ownerSlug = agent.organization?.slug || agent.creator?.username || "-";
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agent/${agent.name}/call`,
    }),
    onError: (e) => {
      console.error("Chat error:", e);
      toast.error("Failed to connect to agent: " + e.message);
    },
    onFinish: (message) => {
      console.log("Chat finished:", message);
    }
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Cold Start Feedback
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "submitted") {
      timer = setTimeout(() => {
        toast.info("Agent is waking up...", {
          description: "This may take up to a minute for cold starts.",
          duration: 10000,
        });
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installCommand = `npx @open-hive/cli add ${agent.name}`;
  const agentUrl = (agent as any).url || `${process.env.NEXT_PUBLIC_APP_URL}/api/agent/${agent.name}`;

  const nodeScaffold = generateNodeScaffold(agent.name, agentUrl);
  const pythonScaffold = generatePythonScaffold(agent.name, agentUrl);

  // Suggestions logic (using agent prompts if available)
  const suggestions = (agent as any).prompts || [];

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ role: "user", parts: [{ type: "text", text: suggestion }] });
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-2xl">
              {agent.name}
            </h1>
            {agent.verificationStatus === "VERIFIED" && (
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 gap-1"
              >
                <ShieldCheck className="size-3" /> Verified
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              v{agent.latestVersion || "0.0.1"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {agent.description || "No description provided for this agent."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {agent.tags?.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-3 space-y-14">
          <section className="space-y-4">
            <h2 className="scroll-m-20 text-lg text-foreground/60 font-semibold tracking-tight first:mt-0 mb-2">
              Playground
            </h2>
            <div className="flex flex-col w-full h-[650px] border border-border/50 rounded-xl bg-background/50 shadow-sm overflow-hidden relative">
              {!session && !isPending && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-6 text-center">
                  <div className="p-4 rounded-full bg-zinc-900 mb-4 ring-1 ring-zinc-800">
                    <Lock className="size-8 text-zinc-400" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-br from-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-2">
                    Authentication Required
                  </h3>
                  <p className="text-muted-foreground max-w-[300px] mb-6">
                    Please log in to access the playground and interact with this agent.
                  </p>
                  <Button
                    onClick={() => router.push("/login")}
                    className="min-w-[140px]"
                  >
                    Log In
                  </Button>
                </div>
              )}
              <Conversation className="pb-4">
                <ConversationContent className="gap-8">
                  {messages.length === 0 && (
                    <ConversationEmptyState
                      icon={<Activity className="size-8 text-muted-foreground/50" />}
                      title="Ready to chat"
                      description={`Start a conversation with ${agent.name}`}
                    />
                  )}
                  {messages.map((m) => (
                    <MessageBranch defaultBranch={0} key={m.id}>
                      <MessageBranchContent>
                        <Message from={m.role === "user" ? "user" : "assistant"}>
                          <div>
                            {/* Placeholder for sources/reasoning if/when provided by the API in compatible format */}

                            <MessageContent className="bg-transparent shadow-none border-0 p-0">
                              <MessageResponse>
                                {m.parts
                                  .filter((part) => part.type === "text")
                                  .map((part) => (part as any).text)
                                  .join("")}
                              </MessageResponse>
                            </MessageContent>
                          </div>
                        </Message>
                      </MessageBranchContent>
                    </MessageBranch>
                  ))}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              <div className="grid shrink-0 gap-4 pt-4 bg-background/50 backdrop-blur-sm">
                {suggestions.length > 0 && messages.length === 0 && (
                  <Suggestions className="px-4">
                    {suggestions.map((suggestion: string) => (
                      <Suggestion
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        suggestion={suggestion}
                      />
                    ))}
                  </Suggestions>
                )}

                <div className="w-full p-2">
                  <PromptInputProvider>
                    <PromptInput
                      globalDrop
                      multiple
                      onSubmit={async ({ text, files }) => {
                        if (!text.trim() && (!files || files.length === 0)) return;

                        const parts: any[] = [];
                        if (text.trim()) {
                          parts.push({ type: "text", text });
                        }
                        if (files) {
                          parts.push(...files);
                        }

                        // Cast parts to match what UIMessage expects if necessary, 
                        // though sendMessage handles this typically.
                        sendMessage({ role: "user", parts } as any);
                      }}
                    >
                      <PromptInputHeader>
                        <PromptInputAttachments>
                          {(attachment) => <PromptInputAttachment data={attachment} />}
                        </PromptInputAttachments>
                      </PromptInputHeader>
                      <PromptInputBody>
                        <PromptInputTextarea
                          ref={textareaRef}
                          placeholder="Message agent..."
                          disabled={isLoading}
                        />
                      </PromptInputBody>
                      <PromptInputFooter>
                        <PromptInputTools>
                          <PromptInputActionMenu>
                            <PromptInputActionMenuTrigger />
                            <PromptInputActionMenuContent>
                              <PromptInputActionAddAttachments />
                            </PromptInputActionMenuContent>
                          </PromptInputActionMenu>

                          {/* <PromptInputButton
                            onClick={() => setUseMicrophone(!useMicrophone)}
                            variant={useMicrophone ? "default" : "ghost"}
                          >
                            <MicIcon size={16} />
                            <span className="sr-only">Microphone</span>
                          </PromptInputButton>
                          <PromptInputButton
                            onClick={() => setUseWebSearch(!useWebSearch)}
                            variant={useWebSearch ? "default" : "ghost"}
                          >
                            <GlobeIcon size={16} />
                            <span>Search</span>
                          </PromptInputButton> */}

                        </PromptInputTools>
                        <PromptInputSubmit
                          status={status}
                          disabled={isLoading}
                        />
                      </PromptInputFooter>
                    </PromptInput>
                  </PromptInputProvider>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="scroll-m-20 text-lg text-foreground/60 font-semibold tracking-tight first:mt-0 mb-2">
              Installation
            </h2>

            <p className="text-sm text-primary mt-4 font-semibold">
              Using CLI
            </p>
            <div className="relative rounded-lg bg-zinc-950 dark:bg-zinc-900 py-3 font-mono text-sm text-zinc-50 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-4">
                <code className="relative rounded bg-muted/20 font-mono text-sm">
                  {installCommand}
                </code>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-zinc-50"
                        onClick={() => copyToClipboard(installCommand)}
                      >
                        {copied ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy command</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <p className="text-sm text-primary mt-8 font-semibold">
              Manual Installation
            </p>
            <Tabs defaultValue="node" className="relative w-full">
              <TabsList className="justify-start rounded-none bg-transparent p-0 gap-1 h-auto mb-4">
                <TabsTrigger value="node">Node.js</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="node" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a new file (e.g., <code>src/agents/{agent.name}.ts</code>) and paste the following:
                </p>
                <CollapsibleCodeBlock code={nodeScaffold} language="typescript" />
              </TabsContent>

              <TabsContent value="python" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a new file (e.g., <code>agents/{agent.name.replace(/-/g, '_')}.py</code>) and paste the following:
                </p>
                <CollapsibleCodeBlock code={pythonScaffold} language="python" />
              </TabsContent>
            </Tabs>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-3">
          {(() => {
            let caps: any[] = [];
            if (Array.isArray((agent as any).capabilities)) {
              caps = (agent as any).capabilities;
            } else if (
              (agent as any).capabilities &&
              typeof (agent as any).capabilities === "object"
            ) {
              caps = Object.keys((agent as any).capabilities).filter(
                (k) => (agent as any).capabilities[k] === true
              );
            }

            if (caps.length === 0) return null;

            return (
              <Card className="border-none shadow-none bg-transparent gap-2">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-sm font-semibold">Capabilities</CardTitle>
                </CardHeader>
                <CardContent className="px-0 flex flex-wrap gap-2">
                  {caps.map((cap: any) => (
                    <Badge
                      key={cap.id || cap}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {typeof cap === "string" ? cap : cap.name}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            );
          })()}

          {(() => {
            const skills = (agent as any).skills;
            if (!skills || !Array.isArray(skills) || skills.length === 0) return null;

            return (
              <Card className="border-none shadow-none bg-transparent gap-2">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-sm font-semibold">Skills</CardTitle>
                </CardHeader>
                <CardContent className="px-0 flex flex-wrap gap-2">
                  {skills.map((skill: any) => (
                    <Badge
                      key={skill.id || skill}
                      variant="secondary"
                      className="text-xs font-normal bg-secondary/50"
                    >
                      {typeof skill === "string" ? skill : skill.name}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            );
          })()}

          <Card className="border-none shadow-none bg-transparent gap-2">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-sm font-semibold">Stats</CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Activity className="size-4" /> Runs
                </span>
                <span className="font-medium">
                  {agent._count?.executions?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="size-4" /> Created
                </span>
                <span className="font-medium">
                  {agent.createdAt
                    ? DateTime.fromISO(agent.createdAt as any).toRelative()
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="size-4" /> Updated
                </span>
                <span className="font-medium">
                  {agent.updatedAt
                    ? DateTime.fromISO(agent.updatedAt as any).toRelative()
                    : "-"}
                </span>
              </div>
              <div className="pt-4">
                <span className="text-muted-foreground block mb-2 text-primary">
                  Maintainer
                </span>
                <div className="flex items-center gap-2 font-medium">
                  {(() => {
                    const maintainer =
                      agent.creator ||
                      agent.user ||
                      (agent.organization
                        ? {
                          name: agent.organization.name,
                          username: agent.organization.slug,
                          image: agent.organization.logo,
                        }
                        : null);

                    return (
                      <>
                        <div className="size-6 bg-primary/10 rounded-full flex items-center justify-center text-xs text-primary overflow-hidden">
                          {maintainer?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={maintainer.image}
                              alt={maintainer.name || "Maintainer"}
                              className="size-full object-cover"
                            />
                          ) : (
                            (
                              maintainer?.name?.[0] ||
                              maintainer?.username?.[0] ||
                              "?"
                            ).toUpperCase()
                          )}
                        </div>
                        {maintainer?.name || maintainer?.username || "Unknown"}
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-none bg-transparent gap-2">
            <CardHeader className="px-0">
              <CardTitle className="text-sm font-semibold">License</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <p className="text-sm text-muted-foreground">
                Apache-2.0 (Default)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
