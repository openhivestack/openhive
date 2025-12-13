"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { AgentDetail, User } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import useSWR, { KeyedMutator } from "swr";
import { toast } from "sonner";

interface AgentContextType {
  agent: AgentDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  runtimeStatus: string;
  loadingRuntime: boolean;
  isTransitioning: boolean;
  togglingRuntime: boolean;
  toggleRuntime: () => Promise<void>;
  mutateRuntime: KeyedMutator<any>;
  isOwner: boolean;
  currentUser: User | null;
  features: Record<string, boolean>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface AgentProviderProps {
  children: ReactNode;
  agentName: string;
  features?: Record<string, boolean>;
}

export function AgentProvider({ children, agentName, features = {} }: AgentProviderProps) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [togglingRuntime, setTogglingRuntime] = useState(false);

  // Fetch current user
  const { data: currentUser } = useSWR("user-me", () => api.user.me());

  const fetchAgent = useCallback(async () => {
    if (!agentName) return;

    setLoading(true);
    setError(null);
    try {
      const { agents } = await api.agent.search(agentName);
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
    const isRunning =
      runtimeStatus === "RUNNING" || runtimeStatus === "BUILDING";
    const targetStatus = isRunning ? "stopped" : "running";

    // Optimistic Update
    // If starting, optimistic is BUILDING. If stopping, optimistic is STOPPED.
    const optimisticStatus =
      targetStatus === "running" ? "BUILDING" : "STOPPED";
    await mutateRuntime(optimisticStatus as any, false);

    try {
      const res = await api.agent.toggle(agentName, targetStatus);

      if (!res.success) {
        throw new Error(res.message || "Failed to toggle runtime");
      }

      toast.success(res.message || `Agent ${targetStatus}...`);

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

  const isOwner = !!(agent && currentUser && agent.userId === currentUser.id);

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
        isOwner,
        currentUser: currentUser || null,
        features,
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
