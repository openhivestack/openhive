"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, History } from "lucide-react";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateTime } from "luxon";
import { api } from "@/lib/api-client";

interface AgentVersionsProps {
  agentName: string;
  initialVersionCount?: number;
}

interface AgentVersion {
  id: string;
  version: string;
  createdAt: string;
  description?: string;
  downloadCount: number;
}

export function AgentVersions({
  agentName,
  initialVersionCount = 0,
}: AgentVersionsProps) {
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchVersions = async () => {
    if (versions.length > 0) return;

    setLoading(true);
    try {
      const { versions: fetchedVersions } = await api.agent.versions(agentName);
      setVersions(
        fetchedVersions.map((v) => ({
          id: v.version,
          version: v.version,
          createdAt: v.createdAt,
          description: "",
          downloadCount: 0,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) fetchVersions();
      }}
    >
      <PopoverTrigger asChild>
        <Item size="xs" asChild className="hover:text-primary cursor-pointer">
          <div className="flex items-center justify-between w-full">
            <ItemMedia>
              <History className="size-3" />
            </ItemMedia>
            <ItemContent className="flex flex-row items-center">
              <ItemTitle className="text-xs">
                {initialVersionCount} Version
                {initialVersionCount === 1 ? "" : "s"}{" "}
              </ItemTitle>
            </ItemContent>
          </div>
        </Item>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center gap-3 border-b p-4 bg-muted/30">
          <div className="flex size-10 items-center justify-center rounded-full border bg-background">
            <History className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold leading-none">Version History</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{initialVersionCount} published versions</span>
            </div>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No versions found.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] h-5"
                      >
                        v{v.version}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {DateTime.fromISO(v.createdAt).toRelative()}
                      </span>
                    </div>
                    {v.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {v.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      onClick={() => {
                        navigator.clipboard.writeText(v.version);
                      }}
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
