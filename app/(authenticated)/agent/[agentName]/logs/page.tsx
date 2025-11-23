"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEvent {
  timestamp: number;
  message: string;
}

export default function AgentLogsPage() {
  const params = useParams();
  const agentName = params.agentName as string;

  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/agent/${agentName}/logs`);
      const data = await res.json();
      setLogs(data.logs || []);
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Live Logs</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loadingLogs}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", loadingLogs && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <Card className="bg-black text-green-400 font-mono text-sm h-[600px] flex flex-col">
        <ScrollArea className="flex-1 p-4">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">
              {loadingLogs ? "Fetching logs..." : "No logs available."}
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="break-words whitespace-pre-wrap">
                  <span className="text-gray-500 mr-4 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
