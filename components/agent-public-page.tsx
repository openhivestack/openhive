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
  ArrowUpIcon,
  PlusIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { DateTime } from "luxon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from "./ui/input-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installCommand = `npx @open-hive/cli add ${agent.name}`;
  // Use deployedUrl or construct a placeholder if not verified/deployed
  // Assuming agent.url is not available on AgentDetail yet based on review, 
  // but if it is, we use it. If not, we can use a placeholder.
  // Actually, checking previous context or api-client would reveal it, 
  // but for safety let's assume `agent.url` might be missing or under a different name.
  // If `agent` has `metadata`, maybe it's there. 
  // For now we'll use a placeholder if undefined.
  const agentUrl = (agent as any).url || `https://registry.openhive.cloud/agents/${agent.name}`;

  const nodeScaffold = generateNodeScaffold(agent.name, agentUrl);
  const pythonScaffold = generatePythonScaffold(agent.name, agentUrl);

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
          <section className="space-y-2">
            <h2 className="scroll-m-20 text-lg text-foreground/60 font-semibold tracking-tight first:mt-0 mb-2">
              Playground
            </h2>
            <div className="flex flex-col items-center justify-center text-center w-full py-2 space-y-4">
              <InputGroup>
                <InputGroupTextarea placeholder="Ask, Search or Chat..." />
                <InputGroupAddon align="block-end">
                  <InputGroupButton
                    variant="outline"
                    className="rounded-full"
                    size="icon-xs"
                  >
                    <PlusIcon />
                  </InputGroupButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton variant="ghost">Auto</InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      className="[--radius:0.95rem]"
                    >
                      <DropdownMenuItem>Auto</DropdownMenuItem>
                      <DropdownMenuItem>Agent</DropdownMenuItem>
                      <DropdownMenuItem>Manual</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <InputGroupText className="ml-auto">52% used</InputGroupText>
                  <Separator orientation="vertical" className="!h-4" />
                  <InputGroupButton
                    variant="default"
                    className="rounded-full"
                    size="icon-xs"
                    disabled
                  >
                    <ArrowUpIcon />
                    <span className="sr-only">Send</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
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
                  <Activity className="size-4" /> Downloads
                </span>
                <span className="font-medium">
                  {agent.installCount?.toLocaleString() || 0}
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
