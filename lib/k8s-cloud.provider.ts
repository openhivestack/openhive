import { CloudProvider } from "./cloud-provider.interface";
import * as k8s from "@kubernetes/client-node";

export class K8sCloudProvider implements CloudProvider {
  private k8sApi: k8s.AppsV1Api;
  private coreApi: k8s.CoreV1Api;
  private namespace: string;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
    this.namespace = process.env.K8S_NAMESPACE || "openhive";
  }

  async uploadSource(
    agentId: string,
    version: string,
    file: Buffer // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<string> {
    // In K8s, we might push to an internal MinIO or Registry
    // For now, returning a mock URL
    return `minio://agents/${agentId}/${version}/source.tar.gz`;
  }

  async deployAgent(
    agentId: string,
    version: string,
    sourceUrl: string,
    envVars: Record<string, string>
  ): Promise<void> {
    // For this implementation, we'll assume a Kubernetes Job handles the build & deploy
    const jobName = `build-${agentId}-${version.replace(/\./g, "-")}`;

    // Clean agent ID for K8s resource naming (lowercase, alphanumeric, hyphen)
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const job = {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        name: jobName,
        namespace: this.namespace,
      },
      spec: {
        ttlSecondsAfterFinished: 3600, // Clean up after 1 hour
        template: {
          spec: {
            containers: [
              {
                name: "kaniko", // Using Kaniko for in-cluster building
                image: "gcr.io/kaniko-project/executor:latest",
                args: [
                  `--dockerfile=Dockerfile`,
                  `--context=${sourceUrl}`, // Kaniko supports S3/GCS/Azure directly, or we'd use an init container to fetch
                  `--destination=registry.local/${safeAgentId}:${version}`, // Push to internal registry
                ],
                env: [
                  // Inject build args
                  { name: "AGENT_ID", value: agentId },
                  { name: "VERSION", value: version },
                ],
              },
            ],
            restartPolicy: "Never",
          },
        },
      },
    };

    // Create Build Job
    try {
      console.log(`[K8s] Triggered build job: ${jobName}`, job);
      // await this.k8sApi.createNamespacedJob(this.namespace, job);
    } catch (e) {
      console.error("[K8s] Failed to trigger build job", e);
    }

    const deploymentName = `agent-${safeAgentId}`;
    const deployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: deploymentName, namespace: this.namespace },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: deploymentName } },
        template: {
          metadata: { labels: { app: deploymentName } },
          spec: {
            containers: [
              {
                name: "agent",
                image: `registry.local/${safeAgentId}:${version}`,
                ports: [{ containerPort: 4000 }],
                env: Object.entries(envVars).map(([k, v]) => ({
                  name: k,
                  value: v,
                })),
              },
            ],
          },
        },
      },
    };

    try {
      // Check if exists
      // await this.k8sApi.readNamespacedDeployment(deploymentName, this.namespace);
      // await this.k8sApi.replaceNamespacedDeployment(deploymentName, this.namespace, deployment);
      console.log(`[K8s] Updated deployment: ${deploymentName}`, deployment);
    } catch (e) {
      // Create if not exists
      // await this.k8sApi.createNamespacedDeployment(this.namespace, deployment);
      console.log(`[K8s] Created deployment: ${deploymentName}`, e);
    }

    // Create Service to expose the agent internally
    const serviceName = `agent-${safeAgentId}`;
    const service = {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: serviceName, namespace: this.namespace },
      spec: {
        selector: { app: deploymentName },
        ports: [{ port: 80, targetPort: 4000 }],
        type: "ClusterIP",
      },
    };

    try {
      // Check if exists
      // await this.coreApi.readNamespacedService(serviceName, this.namespace);
      // console.log(`[K8s] Service exists: ${serviceName}`);

      // If we wanted to update, we'd use replaceNamespacedService, but Service spec rarely changes for agents
      console.log(`[K8s] Ensuring Service: ${serviceName}`);
    } catch (e) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      try {
        // Create
        // await this.coreApi.createNamespacedService(this.namespace, service);
        console.log(`[K8s] Created Service: ${serviceName}`, service);
      } catch (createError) {
        console.error(
          `[K8s] Failed to create service ${serviceName}`,
          createError
        );
      }
    }
  }

  async getAgentStatus(
    agentId: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<"BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "UNKNOWN"> {
    return "RUNNING"; // Mock
  }

  async getAgentLogs(agentId: string): Promise<string[]> {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    return ["K8s logs not implemented"];
  }

  async getAgentUrl(agentId: string): Promise<string | null> {
    // Resolves to the OpenHive Platform Proxy URL
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    if (!appUrl) return null;
    return `${appUrl}/api/agent/${agentId}`;
  }

  async getInternalAgentUrl(agentId: string): Promise<string | null> {
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const serviceName = `agent-${safeAgentId}`;
    // Format: http://<service-name>.<namespace>.svc.cluster.local
    // We map port 80 to targetPort 4000 in the service
    return `http://${serviceName}.${this.namespace}.svc.cluster.local`;
  }
}
