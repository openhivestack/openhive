const { ECSClient, UpdateServiceCommand, DescribeServicesCommand } = require('@aws-sdk/client-ecs');

class AgentManager {
  constructor() {
    this.ecs = new ECSClient({ region: process.env.AWS_REGION });
    this.cluster = process.env.ECS_CLUSTER;
    this.projectName = process.env.PROJECT_NAME;
    this.environment = process.env.ENVIRONMENT;

    // Track active agents: name -> { lastAccess: Date, status: 'ACTIVE' | 'SCALED_DOWN' | 'WAKING_UP' }
    this.activeAgents = new Map();

    // Start the idle reaper loop
    setInterval(() => this.checkIdleAgents(), 60 * 1000); // Check every minute
  }

  getServiceName(agentName) {
    // Assumption: Service name format
    // UPDATE: Based on AwsCloudProvider, the format is `service-${agentName}`
    // The project/env are scoped by the Cluster itself.
    return `service-${agentName}`;
  }

  async checkIdleAgents() {
    const now = new Date();
    const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    console.log(`[AgentManager] Checking for idle agents... (${this.activeAgents.size} tracked)`);

    for (const [agentName, data] of this.activeAgents.entries()) {
      if (data.status === 'ACTIVE' && (now - data.lastAccess) > IDLE_TIMEOUT_MS) {
        console.log(`[AgentManager] Agent ${agentName} has been idle since ${data.lastAccess.toISOString()}. Scaling down.`);
        this.scaleDown(agentName);
      }
    }
  }

  async scaleDown(agentName) {
    // Optimistically update state to prevent double-scaling
    const agentData = this.activeAgents.get(agentName);
    if (agentData) agentData.status = 'SCALED_DOWN';

    try {
      const command = new UpdateServiceCommand({
        cluster: this.cluster,
        service: this.getServiceName(agentName),
        desiredCount: 0
      });
      await this.ecs.send(command);
      console.log(`[AgentManager] Successfully scaled down agent ${agentName}`);
    } catch (error) {
      console.error(`[AgentManager] Failed to scale down agent ${agentName}:`, error);
      // Revert state if we failed, so we try again next time
      if (agentData) agentData.status = 'ACTIVE';
    }
  }

  async ensureAgentActive(agentName) {
    // SAFETY: Never track or attempt to scale the gateway itself.
    // This prevents a recursive suicide loop if someone requests /gateway/...
    if (agentName === 'gateway') {
      return;
    }

    let agentData = this.activeAgents.get(agentName);

    // If we don't know about this agent, assume it might be down or we just restarted.
    // For safety, we treat it as SCALED_DOWN initially unless we prove otherwise, 
    // OR we just trigger a wake-up ensuring desiredCount=1.
    if (!agentData) {
      agentData = { lastAccess: new Date(), status: 'SCALED_DOWN' };
      this.activeAgents.set(agentName, agentData);
    }

    // Update last access time immediately
    agentData.lastAccess = new Date();

    if (agentData.status === 'ACTIVE') {
      return;
    }

    if (agentData.status === 'WAKING_UP') {
      // Already waking up, just wait for it
      await this.waitForHealthy(agentName);
      return;
    }

    // If SCALED_DOWN, trigger wake up
    console.log(`[AgentManager] Agent ${agentName} is dormant. Waking up...`);
    agentData.status = 'WAKING_UP';

    try {
      await this.scaleUp(agentName);
      await this.waitForHealthy(agentName);
      agentData.status = 'ACTIVE';
      console.log(`[AgentManager] Agent ${agentName} is now ACTIVE.`);
    } catch (error) {
      console.error(`[AgentManager] Failed to wake up agent ${agentName}:`, error);
      agentData.status = 'SCALED_DOWN'; // Reset so we try again on next request
      throw error;
    }
  }

  async scaleUp(agentName) {
    const command = new UpdateServiceCommand({
      cluster: this.cluster,
      service: this.getServiceName(agentName),
      desiredCount: 1
    });
    await this.ecs.send(command);
  }

  async waitForHealthy(agentName) {
    const serviceName = this.getServiceName(agentName);
    const MAX_RETRIES = 60; // Wait up to 60-120s? 
    // Fargate startup can take 30-60s. 

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const command = new DescribeServicesCommand({
          cluster: this.cluster,
          services: [serviceName]
        });
        const response = await this.ecs.send(command);
        const service = response.services[0];

        if (!service) throw new Error(`Service ${serviceName} not found`);

        // Check if runningCount >= 1
        if (service.runningCount >= 1) {
          return;
        }

        // Wait 1s
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`[AgentManager] Error waiting for ${agentName}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Timeout waiting for agent ${agentName} to become healthy`);
  }
}

module.exports = new AgentManager();
