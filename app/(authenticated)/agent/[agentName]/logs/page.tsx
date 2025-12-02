"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { api, LogEvent } from "@/lib/api-client";

export default function AgentLogsPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const logs = await api.agent.telemetry.logs(agentName);
      setLogs(logs);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  }, [agentName]);

  // Initial Fetch
  useEffect(() => {
    if (agentName) fetchLogs();
  }, [agentName, fetchLogs]);

  return (
    <div className="h-[calc(100vh-167px)] bg-black">
      <div className="flex justify-between items-center text-blue-500 px-4 py-2">
        <h2 className="text-sm">Live Logs</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchLogs}
          disabled={loadingLogs}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", loadingLogs && "animate-spin")}
          />
        </Button>
      </div>

      <div className="bg-black text-gray-300 font-mono text-sm h-full flex flex-col rounded-none">
        <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-180px)]">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">
              {loadingLogs ? "Fetching logs..." : "No logs available."}
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="break-words whitespace-pre-wrap flex items-start hover:bg-slate-800/60 px-2 py-1 rounded-md transition-colors"
                >
                  <span className="text-gray-500 mr-4 select-none shrink-0 pt-[2px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <SyntaxHighlighter
                      language="bash"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: "transparent",
                        fontSize: "inherit",
                        lineHeight: "inherit",
                      }}
                      wrapLongLines={true}
                    >
                      {log.message}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
