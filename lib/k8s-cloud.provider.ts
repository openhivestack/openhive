import {
  CloudProvider,
  AgentTask,
  AgentMetrics,
  LogEvent,
} from "./cloud-provider.interface";
import * as k8s from "@kubernetes/client-node";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export class K8sCloudProvider implements CloudProvider {
  private k8sApi: k8s.AppsV1Api;
  private coreApi: k8s.CoreV1Api;
  private batchApi: k8s.BatchV1Api;
  private namespace: string;
  private minioClient: S3Client;
  private bucket: string;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
    this.batchApi = kc.makeApiClient(k8s.BatchV1Api);
    this.namespace = process.env.K8S_NAMESPACE || "openhive";
    this.bucket = process.env.K8S_STORAGE_BUCKET || "openhive-agents";

    this.minioClient = new S3Client({
      region: "us-east-1", // MinIO SDK requires a region, but we use local endpoint
      endpoint:
        process.env.K8S_MINIO_ENDPOINT || "http://minio.openhive.svc:9000",
      credentials: {
        accessKeyId: process.env.K8S_MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.K8S_MINIO_SECRET_KEY || "minioadmin",
      },
      forcePathStyle: true,
    });
  }

  async uploadSource(
    agentId: string,
    version: string,
    file: Buffer
  ): Promise<string> {
    const key = `agents/${agentId}/${version}/source.tar.gz`;

    try {
      await this.minioClient.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file,
        })
      );
      console.log(`[K8s] Uploaded source to MinIO: ${this.bucket}/${key}`);
    } catch (e) {
      console.error(`[K8s] Failed to upload source to MinIO`, e);
      throw e;
    }

    // Return the s3:// URI which Kaniko understands natively
    return `s3://${this.bucket}/${key}`;
  }

  async deployAgent(
    agentId: string,
    version: string,
    sourceUrl: string,
    envVars: Record<string, string>
  ): Promise<void> {
    // Determine agent port from env vars or default to 4000
    const agentPort = envVars.PORT ? parseInt(envVars.PORT, 10) : 4000;

    // For this implementation, we'll assume a Kubernetes Job handles the build & deploy
    const jobName = `build-${agentId}-${version.replace(/\./g, "-")}`;

    // Clean agent ID for K8s resource naming (lowercase, alphanumeric, hyphen)
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    // Determine the internal S3 endpoint for Kaniko running inside the cluster
    const internalMinioEndpoint =
      process.env.K8S_MINIO_ENDPOINT || "http://minio.openhive.svc:9000";

    // Kaniko (inside cluster) pushes to the Service DNS
    const registryPushHost =
      process.env.K8S_REGISTRY_URL || "openhive-registry:5000";

    // Kubelet (on node) pulls from localhost NodePort (Minikube standard)
    // This assumes the registry service is NodePort 30500 as defined in values.yaml
    const registryPullHost =
      process.env.K8S_REGISTRY_PULL_URL || "localhost:30500";

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
                  `--context=${sourceUrl}`,
                  `--destination=${registryPushHost}/${safeAgentId}:${version}`,
                  `--insecure`,
                  `--skip-tls-verify`,
                  `--skip-tls-verify-pull`,
                ],
                env: [
                  // Inject build args
                  { name: "AGENT_ID", value: agentId },
                  { name: "VERSION", value: version },

                  // MinIO / S3 Credentials for Kaniko to fetch context
                  {
                    name: "AWS_ACCESS_KEY_ID",
                    value: process.env.K8S_MINIO_ACCESS_KEY || "minioadmin",
                  },
                  {
                    name: "AWS_SECRET_ACCESS_KEY",
                    value: process.env.K8S_MINIO_SECRET_KEY || "minioadmin",
                  },
                  { name: "AWS_REGION", value: "us-east-1" },
                  {
                    name: "S3_ENDPOINT",
                    value: internalMinioEndpoint,
                  },
                  { name: "S3_FORCE_PATH_STYLE", value: "true" },
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
      console.log(`[K8s] Triggered build job: ${jobName}`);
      await this.batchApi.createNamespacedJob({
        namespace: this.namespace,
        body: job,
      });
    } catch (e) {
      console.error(
        "[K8s] Failed to trigger build job (it might already exist)",
        e
      );
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
                image: `${registryPullHost}/${safeAgentId}:${version}`,
                ports: [{ containerPort: agentPort }],
                env: [
                  { name: "PORT", value: String(agentPort) },
                  ...Object.entries(envVars)
                    .filter(([k]) => k !== "PORT")
                    .map(([k, v]) => ({
                      name: k,
                      value: v,
                    })),
                ],
              },
            ],
          },
        },
      },
    };

    try {
      // Check if exists
      await this.k8sApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });
      await this.k8sApi.replaceNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
        body: deployment,
      });
      console.log(`[K8s] Updated deployment: ${deploymentName}`);
    } catch (e) {
      // Create if not exists
      try {
        await this.k8sApi.createNamespacedDeployment({
          namespace: this.namespace,
          body: deployment,
        });
        console.log(`[K8s] Created deployment: ${deploymentName}`);
      } catch (createErr) {
        console.error(
          `[K8s] Failed to create deployment ${deploymentName}`,
          createErr
        );
      }
    }

    // Create Service to expose the agent internally
    const serviceName = `agent-${safeAgentId}`;
    const service = {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: serviceName, namespace: this.namespace },
      spec: {
        selector: { app: deploymentName },
        ports: [{ port: 80, targetPort: agentPort }],
        type: "ClusterIP",
      },
    };

    try {
      // Check if exists
      const existingService = await this.coreApi.readNamespacedService({
        name: serviceName,
        namespace: this.namespace,
      });

      // Update if targetPort changed
      if (existingService.spec?.ports?.[0]?.targetPort !== agentPort) {
        console.log(
          `[K8s] Updating Service ${serviceName} port to ${agentPort}`
        );
        // Preserve ClusterIP and other fields by using the existing service object
        // but updating the port spec.
        if (existingService.spec && existingService.spec.ports) {
          existingService.spec.ports[0].targetPort = agentPort;
          await this.coreApi.replaceNamespacedService({
            name: serviceName,
            namespace: this.namespace,
            body: existingService,
          });
        }
      } else {
        console.log(`[K8s] Service exists and matches port: ${serviceName}`);
      }
    } catch (e) {
      try {
        // Create
        await this.coreApi.createNamespacedService({
          namespace: this.namespace,
          body: service,
        });
        console.log(`[K8s] Created Service: ${serviceName}`, service);
      } catch (createError) {
        console.error(
          `[K8s] Failed to create service ${serviceName}`,
          createError
        );
      }
    }
  }

  async startAgent(agentId: string): Promise<void> {
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const deploymentName = `agent-${safeAgentId}`;
    console.log(`[K8s] Starting agent (scaling to 1): ${deploymentName}`);
    try {
      const deployment = await this.k8sApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });

      if (deployment.spec) {
        deployment.spec.replicas = 1;
        await this.k8sApi.replaceNamespacedDeployment({
          name: deploymentName,
          namespace: this.namespace,
          body: deployment,
        });
      }
    } catch (e) {
      console.error(`[K8s] Failed to start agent ${deploymentName}`, e);
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const deploymentName = `agent-${safeAgentId}`;
    console.log(`[K8s] Stopping agent (scaling to 0): ${deploymentName}`);
    try {
      const deployment = await this.k8sApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });

      if (deployment.spec) {
        deployment.spec.replicas = 0;
        await this.k8sApi.replaceNamespacedDeployment({
          name: deploymentName,
          namespace: this.namespace,
          body: deployment,
        });
      }
    } catch (e) {
      console.error(`[K8s] Failed to stop agent ${deploymentName}`, e);
    }
  }

  async getAgentStatus(
    agentId: string
  ): Promise<"BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "UNKNOWN"> {
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const deploymentName = `agent-${safeAgentId}`;

    try {
      const res = await this.k8sApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });
      const deployment = res;

      if (!deployment.status) return "UNKNOWN";
      if (
        deployment.status.readyReplicas &&
        deployment.status.readyReplicas > 0
      )
        return "RUNNING";
      if (deployment.spec?.replicas === 0) return "STOPPED";

      return "BUILDING"; // Assume building/starting if exists but not ready
    } catch (e) {
      return "UNKNOWN";
    }
  }

  async getAgentLogs(agentId: string): Promise<LogEvent[]> {
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const labelSelector = `app=agent-${safeAgentId}`;

    try {
      const pods = await this.coreApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: labelSelector,
      });

      // In object-style API, result is usually the object directly or { body: ... }
      // If using the generated client (1.x+), it typically returns the object directly or Promise<V1PodList>
      // We'll check both to be safe.
      const items = (pods as any).items || (pods as any).body?.items;

      if (!items || items.length === 0) {
        return [];
      }

      const allLogs: LogEvent[] = [];

      for (const pod of items) {
        if (!pod.metadata?.name) continue;

        try {
          const res = await this.coreApi.readNamespacedPodLog({
            name: pod.metadata.name,
            namespace: this.namespace,
            container: "agent",
            tailLines: 100,
            timestamps: true,
          });

          // In object-style API, readNamespacedPodLog usually returns string
          const logs = typeof res === "string" ? res : (res as any).body;

          if (logs) {
            const lines = logs.split("\n");
            for (const line of lines) {
              if (!line.trim()) continue;

              // Timestamps format: 2023-10-27T10:00:00.000000000Z ...rest of message
              const firstSpace = line.indexOf(" ");
              if (firstSpace > 0) {
                const timestampStr = line.substring(0, firstSpace);
                const message = line.substring(firstSpace + 1);
                const timestamp = new Date(timestampStr).getTime();

                if (!isNaN(timestamp)) {
                  allLogs.push({ timestamp, message });
                } else {
                  // Fallback if parsing fails
                  allLogs.push({ timestamp: Date.now(), message: line });
                }
              } else {
                allLogs.push({ timestamp: Date.now(), message: line });
              }
            }
          }
        } catch (e) {
          console.error(
            `[K8s] Failed to read logs for pod ${pod.metadata.name}`,
            e
          );
        }
      }

      return allLogs.sort((a, b) => a.timestamp - b.timestamp);
    } catch (e) {
      console.error(`[K8s] Failed to list pods for ${agentId}`, e);
      return [];
    }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAgentTasks(agentId: string, limit = 10): Promise<AgentTask[]> {
    // Mock implementation for K8s
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAgentMetrics(agentId: string, range: string): Promise<AgentMetrics> {
    // Mock implementation for K8s
    return {
      totalExecutions: 0,
      successRate: 0,
      avgDurationMs: 0,
      errorCount: 0,
      timeSeries: [],
    };
  }

  async getEnvironmentVariables(
    agentId: string
  ): Promise<Record<string, string>> {
    try {
      const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const deploymentName = `agent-${safeAgentId}`;

      const res = await this.k8sApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });

      // In new client version, usually 'res' is the actual object if Promise<V1Deployment>
      const deployment = res;
      const container = (deployment as any).spec?.template?.spec
        ?.containers?.[0];

      if (!container || !container.env) {
        return {};
      }

      const envVars: Record<string, string> = {};
      container.env.forEach((e: any) => {
        if (e.name && e.value) {
          envVars[e.name] = e.value;
        }
      });
      return envVars;
    } catch (error) {
      console.error(`[K8s] Error fetching env vars for ${agentId}:`, error);
      return {};
    }
  }

  async updateEnvironmentVariables(
    agentId: string,
    envVars: Record<string, string>
  ): Promise<void> {
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const deploymentName = `agent-${safeAgentId}`;

    try {
      const deployment = await this.k8sApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });

      if (
        !deployment.spec ||
        !deployment.spec.template ||
        !deployment.spec.template.spec ||
        !deployment.spec.template.spec.containers ||
        deployment.spec.template.spec.containers.length === 0
      ) {
        throw new Error("Deployment spec invalid");
      }

      const newEnv = [
        { name: "PORT", value: "4000" },
        ...Object.entries(envVars)
          .filter(([k]) => k !== "PORT")
          .map(([name, value]) => ({
            name,
            value,
          })),
      ];

      deployment.spec.template.spec.containers[0].env = newEnv;

      await this.k8sApi.replaceNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
        body: deployment,
      });
      console.log(`[K8s] Updated env vars for ${deploymentName}`);
    } catch (error) {
      console.error(`[K8s] Error updating env vars for ${agentId}:`, error);
      throw error;
    }
  }
}
