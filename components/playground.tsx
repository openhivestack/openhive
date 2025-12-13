"use client";

import { AgentDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Check,
  ChevronsUpDown,
  History,
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Trash,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageBranch,
  MessageBranchContent,
  MessageResponse
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateTime } from "luxon";

interface PlaygroundProps {
  initialAgent?: AgentDetail;
  showAgentSelector?: boolean;
  className?: string;
  showHistory?: boolean;
}

// --- AgentChat Component ---

interface AgentChatProps {
  agent: AgentDetail;
  session: any;
  initialConversationId?: string;
  initialMessages?: any[];
  onNewConversation?: () => void;
  onChatActivity?: () => void;
}

function AgentChat({ agent, session, initialConversationId, initialMessages = [], onNewConversation, onChatActivity }: AgentChatProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use passed ID or generate new one. 
  // We use a ref for the ID to persist it across re-renders without triggering effects, 
  // but we key the component by ID in the parent to force full re-init when switching chats.
  const conversationId = initialConversationId || crypto.randomUUID();

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agent/${agent.name}/call`,
    }),
    onFinish: () => {
      if (onChatActivity) onChatActivity();
    },
    onError: (e) => {
      console.error("Chat error:", e);
      if (e.message.includes("429") || e.message.includes("Too many requests")) {
        toast.error("Rate limit exceeded!", {
          description: "You're chatting too fast. Please log in for higher limits or wait a moment.",
          duration: 5000
        });
      } else {
        toast.error("Failed to connect to agent: " + e.message);
      }
    },
  });

  // Initialize messages if provided (fixes TS error with initialMessages prop)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

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

  // Refocus input when loading finishes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isLoading]);


  // Suggestions logic
  const suggestions = (agent as any)?.prompts || [];

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ role: "user", parts: [{ type: "text", text: suggestion }] }, { body: { id: conversationId } });
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* New Chat Button (Mobile/Context) */}
      {/* <div className="absolute top-4 right-4 z-20">
          <Button variant="ghost" size="icon" onClick={onNewConversation} title="New Chat">
            <Plus className="size-4" />
          </Button>
       </div> */}

      <Conversation className="pb-4 pt-16 flex-1">
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

      <div className="grid shrink-0 gap-4 pt-2 rounded-b-xl bg-background/50 backdrop-blur-sm px-2 pb-2">
        {suggestions.length > 0 && messages.length === 0 && (
          <Suggestions>
            {suggestions.map((suggestion: string) => (
              <Suggestion
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                suggestion={suggestion}
              />
            ))}
          </Suggestions>
        )}

        <div className="w-full">
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

                sendMessage({ role: "user", parts } as any, { body: { id: conversationId } });
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
                  placeholder={`Message ${agent.name}...`}
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
                  <div className="p-2 text-xs text-center text-muted-foreground">
                    {!session ? "Guest Session • Chats are temporary" : "Secure Session • Chats are private"}
                  </div>
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
  );
}

// --- Main Playground Component ---

export function Playground({ initialAgent, showAgentSelector = false, className, showHistory = true }: PlaygroundProps) {
  const { data: session, isPending } = useSession();

  // State
  const [agent, setAgent] = useState<AgentDetail | undefined>(initialAgent);
  const [openSelector, setOpenSelector] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<AgentDetail[]>([]);

  // History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<{ id: string, messages: any[] } | null>(null);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID()); // For forcing new chats

  // Fetch agents if selector is enabled
  useEffect(() => {
    if (showAgentSelector) {
      api.agent.search("", 1, 10).then((res) => {
        setAvailableAgents(res.agents);
        if (!agent && res.agents.length > 0) {
          setAgent(res.agents[0]);
        }
      }).catch(err => console.error("Failed to fetch agents", err));
    }
  }, [showAgentSelector]);

  // Fetch History
  const loadHistory = async () => {
    if (!showHistory) return;
    try {
      const res = await fetch("/api/user/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  useEffect(() => {
    if (session && showHistory && historyOpen) {
      loadHistory();
    }
  }, [session, showHistory, historyOpen]);

  // Load specific conversation
  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversation/${id}`);
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;

        // Transform Prisma messages to AI SDK messages
        // (Assuming simple transformation for now, might need more robust mapping)
        const messages = conv.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          // Handle both string and JSON content attempts
          content: typeof m.content === 'string' ? m.content : (m.content.text || JSON.stringify(m.content)),
          parts: typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content,
        }));

        setCurrentConversation({ id: conv.id, messages });

        // Also update agent if it's different and we have it (optional feature)
        // For now keeping agent fixed or derived from context
      }
    } catch (e) {
      toast.error("Failed to load conversation");
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversation/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations(conversations.filter((c) => c.id !== id));
        if (currentConversation?.id === id) {
          setCurrentConversation(null);
        }
        toast.success("Conversation deleted");
      } else {
        toast.error("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Failed to delete conversation", error);
      toast.error("Failed to delete conversation");
    }
  };

  // Update local agent state
  useEffect(() => {
    if (initialAgent) {
      setAgent(initialAgent);
    }
  }, [initialAgent]);

  const handleNewChat = () => {
    setCurrentConversation(null);
    setSessionId(crypto.randomUUID());
  };

  return (
    <div className={cn("flex w-full border border-border/50 rounded-xl bg-background/50 shadow-sm overflow-hidden h-[600px]", className)}>

      {/* Sidebar (History) */}
      {showHistory && (
        <div
          className={cn(
            "bg-muted/30 border-r border-border/50 transition-all duration-300 ease-in-out flex flex-col",
            historyOpen ? "w-[250px]" : "w-0 opacity-0 overflow-hidden"
          )}
        >
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <span className="text-sm font-medium">History</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleNewChat()}>
              <Plus className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map(c => (
                <Button
                  key={c.id}
                  variant={currentConversation?.id === c.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-xs h-auto py-2 px-3 flex-col items-start gap-1 group"
                  onClick={() => loadConversation(c.id)}
                >
                  <div className="flex w-full items-center justify-between gap-1 overflow-hidden">
                    <span className="font-medium truncate text-left flex-1">{c.title || "New Conversation"}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => deleteConversation(e, c.id)}
                      title="Delete Conversation"
                    >
                      <Trash className="size-3 text-muted-foreground group-hover:text-destructive" />
                    </Button>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-full text-left flex justify-between">
                    <span>{c.agent.name}</span>
                    <span>{DateTime.fromISO(c.updatedAt).toRelative()}</span>
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full">

        {/* Header Controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">

          {/* Toggle History */}
          {session && showHistory && (
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              title={historyOpen ? "Close History" : "Open History"}
            >
              {historyOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
          )}

          {showAgentSelector && (
            <Popover open={openSelector} onOpenChange={setOpenSelector}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSelector}
                  className="w-[200px] justify-between bg-background/80 backdrop-blur-sm"
                >
                  {agent ? agent.name : "Select agent..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search agents..." />
                  <CommandList>
                    <CommandEmpty>No agent found.</CommandEmpty>
                    <CommandGroup>
                      {availableAgents.map((a) => (
                        <CommandItem
                          key={a.name}
                          value={a.name}
                          onSelect={(currentValue) => {
                            if (currentValue !== agent?.name) {
                              setAgent(a);
                              handleNewChat();
                            }
                            setOpenSelector(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              agent?.name === a.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {a.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {!session && !isPending && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                    Guest Mode
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chats are not saved to your profile.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {agent ? (
            <AgentChat
              key={currentConversation?.id || sessionId}
              agent={agent}
              session={session}
              initialConversationId={currentConversation?.id}
              initialMessages={currentConversation?.messages}
              onNewConversation={handleNewChat}
              onChatActivity={loadHistory}
            />
          ) : (
            <div className="flex flex-col items-center justify-center size-full min-h-[400px] text-muted-foreground gap-2">
              <Activity className="size-8 opacity-20" />
              <p>Select an agent to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
