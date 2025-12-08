const { ECSClient, UpdateServiceCommand, DescribeServicesCommand, ListServicesCommand } = require('@aws-sdk/client-ecs');

class AgentManager {
  constructor() {
    this.ecs = new ECSClient({ region: process.env.AWS_REGION });
    this.cluster = process.env.ECS_CLUSTER;
    this.projectName = process.env.PROJECT_NAME;
    this.environment = process.env.ENVIRONMENT;

    // Track active agents: name -> { lastAccess: Date, status: 'ACTIVE' | 'SCALED_DOWN' | 'WAKING_UP' }
    this.activeAgents = new Map();

    // Initial discovery of running agents
    this.discoverRunningAgents();

    // Start the idle reaper loop
    setInterval(() => this.checkIdleAgents(), 60 * 1000); // Check every minute

    // Re-run discovery every 5 minutes to catch agents deployed externally
    setInterval(() => this.discoverRunningAgents(), 5 * 60 * 1000);
  }

  getServiceName(agentName) {
    // Assumption: Service name format
    // UPDATE: Based on AwsCloudProvider, the format is `service-${agentName}`
    // The project/env are scoped by the Cluster itself.
    return `service-${agentName}`;
  }

  async discoverRunningAgents() {
    console.log('[AgentManager] Discovering running agents provided by ECS...');
    try {
      const command = new ListServicesCommand({
        cluster: this.cluster,
        maxResults: 100 // Handle pagination if > 100 services needed later
      });
      const response = await this.ecs.send(command);
      const serviceArns = response.serviceArns || [];

      if (serviceArns.length === 0) return;

      // Describe to get names and status
      // We process in chunks of 10 if there are many, but ListServices usually returns ARNs
      // and DescribeServices accepts up to 10. Let's do a simple loop for now assuming < 100.
      // Actually DescribeServices limit is 10. We need to chunk.

      const chunks = [];
      for (let i = 0; i < serviceArns.length; i += 10) {
        chunks.push(serviceArns.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const describeCmd = new DescribeServicesCommand({
          cluster: this.cluster,
          services: chunk
        });
        const descRes = await this.ecs.send(describeCmd);

        for (const service of descRes.services || []) {
          const name = service.serviceName;

          // Check if it matches our pattern "service-{agentName}"
          if (!name.startsWith('service-')) continue;

          const agentName = name.replace('service-', '');

          // Ignore gateway itself or other non-agents if any
          if (agentName === 'gateway') continue;

          if (service.status === 'ACTIVE' && service.runningCount > 0) {
            // If we successfully found a running agent we didn't know about, track it.
            // We give it a "fresh" start time so it doesn't get reaped immediately.
            if (!this.activeAgents.has(agentName)) {
              console.log(`[AgentManager] Discovered existing running agent: ${agentName}`);
              this.activeAgents.set(agentName, {
                lastAccess: new Date(),
                status: 'ACTIVE'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[AgentManager] Failed to discover running agents:', error);
    }
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
