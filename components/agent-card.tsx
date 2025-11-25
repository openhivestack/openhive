"use client";

import { useState } from "react";
import { Agent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BotIcon,
  Copy,
  Cpu,
  FileJson,
  IdCard,
  Shield,
  Check,
  X,
  Layers,
} from "lucide-react";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentCardProps {
  info: Agent;
}

export function AgentCard({ info }: AgentCardProps) {
  const [agent, setAgent] = useState<Agent>(info);

  const fetchLiveCard = async () => {
    try {
      const res = await fetch(`/api/agent/${info.name}/card`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data as Agent);
      }
    } catch (error) {
      console.error("Failed to fetch live card:", error);
    }
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) fetchLiveCard();
      }}
    >
      <PopoverTrigger asChild>
        <Item variant="ghost" size="xs" asChild className="hover:text-primary">
          <a href="#">
            <ItemMedia>
              <IdCard className="size-3" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-xs">Agent Card</ItemTitle>
            </ItemContent>
          </a>
        </Item>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center gap-3 border-b p-4 bg-muted/30">
          <div className="flex size-10 items-center justify-center rounded-full border bg-background">
            <BotIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold leading-none">{agent.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>v{agent.version}</span>
              <span>•</span>
              <span>A2A v{agent.protocolVersion}</span>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Endpoint URL
            </Label>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono truncate min-w-0">
                {agent.url}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => navigator.clipboard.writeText(agent.url)}
              >
                <Copy className="size-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="size-3" /> Runtime
              </Label>
              <div className="flex items-center gap-2">
                {agent.runtime ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 h-5 font-normal capitalize"
                  >
                    {agent.runtime}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    -
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Cpu className="size-3" /> Skills
              </Label>
              <div className="flex flex-wrap gap-1">
                {agent.skills.length > 0 ? (
                  <>
                    {agent.skills.slice(0, 3).map((skill: any) => (
                      <Badge
                        key={skill.id}
                        variant="outline"
                        className="text-[10px] px-1.5 h-5 font-normal"
                      >
                        {skill.name || skill.id}
                      </Badge>
                    ))}
                    {agent.skills.length > 3 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 h-5 font-normal cursor-help"
                            >
                              +{agent.skills.length - 3}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-col gap-1">
                              {agent.skills.slice(3).map((skill: any) => (
                                <span key={skill.id} className="text-xs">
                                  {skill.name || skill.id}
                                </span>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    -
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="size-3" /> Capabilities
            </Label>
            <div className="flex flex-wrap gap-2 w-full">
              {agent.capabilities &&
              Object.keys(agent.capabilities).length > 0 ? (
                Object.entries(agent.capabilities).map(([key, enabled]) => (
                  <Badge
                    key={key}
                    variant={enabled ? "default" : "outline"}
                    className={`text-[10px] px-2 py-0.5 h-5 font-normal capitalize ${
                      !enabled && "text-muted-foreground opacity-60"
                    }`}
                  >
                    <span className="mr-1.5">
                      {enabled ? (
                        <Check className="size-2.5" />
                      ) : (
                        <X className="size-2.5" />
                      )}
                    </span>
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">-</span>
              )}
            </div>
          </div>
        </div>
        <div className="border-t bg-muted/30 p-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            asChild
          >
            <a
              href={`${agent.url}/.well-known/agent-card.json`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileJson className="size-3.5" />
              View Raw JSON
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
