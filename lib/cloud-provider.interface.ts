export interface ServiceStatus {
  status: "RUNNING" | "STOPPED" | "PENDING" | "UNKNOWN" | "ERROR";
  desiredCount?: number;
  runningCount?: number;
  pendingCount?: number;
  tasks?: any[]; // We can refine this type later
  deployments?: any[];
  error?: string;
}

export interface CloudProvider {
  // Storage
  generateAgentKey(ownerId: string, agentName: string, version: string): string;
  deleteFile(key: string): Promise<void>;
  getUploadUrl(
    key: string,
    contentType?: string,
    expiresIn?: number
  ): Promise<string>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>;

  // Service Management
  ensureAgentService(agentName: string, version: string): Promise<void>;
  deployAgentService(agentName: string, version: string): Promise<void>;
  stopAgentService(agentName: string): Promise<void>;
  getAgentInternalUrl(agentName: string): string;

  // Build System
  triggerAgentBuild(
    ownerId: string,
    agentName: string,
    version: string
  ): Promise<string>;
  getBuildStatus(buildId: string): Promise<string>;

  // Environment Configuration
  getAgentEnvironment(agentName: string): Promise<Record<string, string>>;
  updateAgentEnvironment(
    agentName: string,
    envVars: Record<string, string>
  ): Promise<void>;

  // Observability
  getServiceStatus(agentName: string): Promise<ServiceStatus>;
  getServiceStatuses(agentNames: string[]): Promise<Record<string, ServiceStatus>>;
  getAgentLogs(agentName: string, limit?: number): Promise<any[]>;
}

