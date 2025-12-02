"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Agent } from "@prisma/client";
import { api } from "@/lib/api-client";
import useSWR, { KeyedMutator } from "swr";
import { toast } from "sonner";

interface AgentContextType {
  agent: Agent | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  runtimeStatus: string;
  loadingRuntime: boolean;
  isTransitioning: boolean;
  togglingRuntime: boolean;
  toggleRuntime: () => Promise<void>;
  mutateRuntime: KeyedMutator<any>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface AgentProviderProps {
  children: ReactNode;
  agentName: string;
}

export function AgentProvider({ children, agentName }: AgentProviderProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [togglingRuntime, setTogglingRuntime] = useState(false);

  const fetchAgent = useCallback(async () => {
    if (!agentName) return;

    setLoading(true);
    setError(null);
    try {
      const agents = await api.agent.search(agentName);
      const found = agents.find((a) => a.name === agentName);
      if (found) {
        setAgent(found);
      } else {
        throw new Error("Agent not found");
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  // Fetch Runtime Status with SWR
  const { data: status, mutate: mutateRuntime } = useSWR(
    agentName ? ["agent-status", agentName] : null,
    ([_, name]) => api.agent.telemetry.status(name),
    {
      refreshInterval: (s) => {
        // Poll faster if transitioning
        if (s === "BUILDING" || s === "UNKNOWN") return 1000;
        // Poll slower if stable
        return 5000;
      },
    }
  );

  const runtimeStatus = status || "STOPPED";
  const loadingRuntime = !status && !togglingRuntime;
  const isTransitioning = runtimeStatus === "BUILDING";

  const toggleRuntime = async () => {
    setTogglingRuntime(true);
    const action = runtimeStatus === "RUNNING" ? "stop" : "start";

    // Optimistic Update
    const optimisticStatus = action === "start" ? "BUILDING" : "STOPPED";
    await mutateRuntime(optimisticStatus as any, false);

    try {
      const res = await fetch(`/api/agent/${agentName}/runtime`, {
        method: "POST",
        body: JSON.stringify({ action }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to toggle runtime");
      }

      toast.success(`Agent ${action === "start" ? "starting" : "stopping"}...`);

      // Trigger a revalidation
      mutateRuntime();
    } catch (error: any) {
      toast.error(error.message);
      // Revalidate to get true status on error
      mutateRuntime();
    } finally {
      setTogglingRuntime(false);
    }
  };

  return (
    <AgentContext.Provider
      value={{
        agent,
        loading,
        error,
        refetch: fetchAgent,
        runtimeStatus,
        loadingRuntime,
        isTransitioning,
        togglingRuntime,
        toggleRuntime,
        mutateRuntime,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
