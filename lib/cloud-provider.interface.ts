export interface CloudProvider {
  /**
   * Upload agent source code (zip) to storage
   */
  uploadSource(agentId: string, version: string, file: Buffer): Promise<string>;

  /**
   * Trigger a build and deployment for the agent
   */
  deployAgent(
    agentId: string,
    version: string,
    sourceUrl: string,
    envVars: Record<string, string>
  ): Promise<void>;

  /**
   * Get the current deployment status
   */
  getAgentStatus(
    agentId: string
  ): Promise<"BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "UNKNOWN">;

  /**
   * Get recent logs for the agent
   */
  getAgentLogs(agentId: string): Promise<string[]>;

  /**
   * Get the public URL where the agent is accessible
   * (e.g. The OpenHive Platform Proxy URL)
   */
  getAgentUrl(agentId: string): Promise<string | null>;

  /**
   * Get the internal URL where the agent is running
   * (e.g. The Cluster Service URL)
   */
  getInternalAgentUrl(agentId: string): Promise<string | null>;
}
