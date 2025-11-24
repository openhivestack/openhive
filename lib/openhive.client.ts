import { Agent } from "./types";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let error;
    try {
      error = await response.json();
    } catch (_) {
      error = { message: response.statusText };
    }
    throw new Error(error.message || "API request failed");
  }
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return null as T;
  }
  return response.json();
}

class AgentClient {
  private baseUrl: string;

  constructor(baseUrl: string, private agentId: string) {
    this.baseUrl = `${baseUrl}/${agentId}`;
  }

  get(): Promise<Agent> {
    return fetchApi<Agent>(this.baseUrl);
  }

  update(agentData: Partial<Agent>): Promise<Agent> {
    return fetchApi<Agent>(this.baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentData),
    });
  }

  delete(): Promise<void> {
    return fetchApi<void>(this.baseUrl, {
      method: "DELETE",
    });
  }
}

class AgentsClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = `${baseUrl}/agent`;
  }

  list(options?: { page?: number; limit?: number }): Promise<Agent[]> {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    return fetchApi<Agent[]>(url);
  }

  search(query: string, options?: { page?: number; limit?: number }): Promise<Agent[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    return fetchApi<Agent[]>(`${this.baseUrl}?${params.toString()}`);
  }

  create(agentData: Omit<Agent, "id" | "downloads">): Promise<Agent> {
    return fetchApi<Agent>(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentData),
    });
  }

  agent(agentId: string): AgentClient {
    return new AgentClient(this.baseUrl, agentId);
  }
}

export class OpenHiveClient {
  private baseUrl: string;
  public agents: AgentsClient;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
    this.agents = new AgentsClient(this.baseUrl);
  }
}

export const openhive = new OpenHiveClient();
