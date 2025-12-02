import type { Agent, User } from "@prisma/client";

// Ensure BASE_URL is empty string for same-origin requests (default for Next.js app routes)
// If running server-side or in a different environment, this might need adjustment.
const BASE_URL = "";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface AgentVersion {
  version: string;
  createdAt: string;
  installCount: number;
}

export interface AgentTask {
  taskId: string;
  status: string;
  agentVersion: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  error?: string;
}

export interface LogEvent {
  timestamp: number;
  message: string;
}

export interface AgentMetrics {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  errorCount: number;
  timeSeries: {
    timestamp: string;
    value: number;
    errorCount: number;
  }[];
}

export type AgentStatus =
  | "BUILDING"
  | "RUNNING"
  | "STOPPED"
  | "FAILED"
  | "UNKNOWN";

export interface AgentDetail extends Agent {
  creator: {
    name: string | null;
    image: string | null;
    username: string | null;
  } | null;
  version: string;
  latestVersion: string;
  installCount: number;
  status: string;
  [key: string]: any; // For extra properties from agent-card
}

async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}/api${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || res.statusText);
  }

  return res.json();
}

export const api = {
  /**
   * Search for agents (alias for api.agent.search).
   */
  search: async (query: string, page = 1, limit = 20) => {
    return api.agent.search(query, page, limit);
  },
  agent: {
    /**
     * Search for agents by name, description, or tags.
     */
    search: async (query: string, page = 1, limit = 20) => {
      const data = await fetchJson<{
        agents: AgentDetail[];
        pagination: PaginationMeta;
      }>("/agent/search", {
        method: "POST",
        body: JSON.stringify({ query, page, limit }),
      });
      return data;
    },

    /**
     * List recent public agents.
     */
    list: async (page = 1, limit = 20) => {
      const data = await fetchJson<{
        agents: AgentDetail[];
        pagination: PaginationMeta;
      }>("/agent/search", {
        method: "POST",
        body: JSON.stringify({ query: "", page, limit }),
      });
      return data;
    },

    /**
     * Get high-level details (card) for a specific agent.
     */
    card: async (agentName: string) => {
      return await fetchJson<AgentDetail>(`/agent/${agentName}/card`);
    },

    /**
     * Get all versions for a specific agent.
     */
    versions: async (agentName: string, page = 1, limit = 20) => {
      const data = await fetchJson<{
        versions: AgentVersion[];
        pagination: PaginationMeta;
      }>(`/agent/${agentName}/versions?page=${page}&limit=${limit}`);
      return data;
    },

    /**
     * Start or stop the agent.
     */
    toggle: async (agentName: string, status: "running" | "stopped") => {
      return await fetchJson<{
        success: boolean;
        status: string;
        message: string;
      }>(`/agent/${agentName}/toggle`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
    },

    /**
     * Manage agent configuration (environment variables).
     */
    config: {
      get: async (agentName: string) => {
        const data = await fetchJson<{ envVars: Record<string, string> }>(
          `/agent/${agentName}/config`
        );
        return data.envVars;
      },
      update: async (agentName: string, envVars: Record<string, string>) => {
        return await fetchJson<{ success: boolean }>(
          `/agent/${agentName}/config`,
          {
            method: "POST",
            body: JSON.stringify({ envVars }),
          }
        );
      },
    },

    telemetry: {
      /**
       * Get the current deployment status of the agent.
       */
      status: async (agentName: string) => {
        const data = await fetchJson<{ status: AgentStatus }>(
          `/agent/${agentName}/telemetry/status`
        );
        return data.status;
      },

      /**
       * Get execution metrics (success rate, duration, etc.) over a time range.
       */
      metrics: async (
        agentName: string,
        range: "24h" | "48h" | "7d" | "30d" | "60d" | "1h" = "24h"
      ) => {
        const data = await fetchJson<{ metrics: AgentMetrics }>(
          `/agent/${agentName}/telemetry/metrics?range=${range}`
        );
        return data.metrics;
      },

      /**
       * Get recent task executions.
       */
      tasks: async (agentName: string, page = 1, limit = 10) => {
        const data = await fetchJson<{
          tasks: AgentTask[];
          pagination: PaginationMeta;
        }>(`/agent/${agentName}/telemetry/tasks?page=${page}&limit=${limit}`);
        return data;
      },

      /**
       * Get live logs for the agent.
       */
      logs: async (agentName: string) => {
        const data = await fetchJson<{ logs: LogEvent[] }>(
          `/agent/${agentName}/telemetry/logs`
        );
        return data.logs;
      },
    },
  },
  user: {
    /**
     * Get the current authenticated user profile.
     */
    me: async () => {
      const data = await fetchJson<{ user: User }>("/users/me");
      return data.user;
    },
  },
};
