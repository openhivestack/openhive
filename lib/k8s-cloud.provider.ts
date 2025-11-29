import {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  BatchV1Api,
  NetworkingV1Api,
  V1Service,
  V1Deployment,
  V1Job,
  V1EnvVar,
  V1Volume,
  V1VolumeMount,
} from "@kubernetes/client-node";
import { CloudProvider, ServiceStatus } from "./cloud-provider.interface";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as fs from "fs/promises";
import * as path from "path";
import { config } from "./config";

export class K8sCloudProvider implements CloudProvider {
  private k8sApi: CoreV1Api;
  private k8sAppsApi: AppsV1Api;
  private k8sBatchApi: BatchV1Api;
  private k8sNetworkingApi: NetworkingV1Api;

  // Storage Config
  private storageType: "s3" | "local";
  private storagePath: string;
  private storagePvcName: string;

  // MinIO Client (S3 Compatible)
  private s3Client?: S3Client;
  private s3SignerClient?: S3Client;

  // Config
  private namespace: string;
  private storageBucket: string;
  private registryUrl: string;
  private registryPullUrl: string;
  private registrySecretName: string;

  constructor() {
    // Initialize Kubernetes Client
    const kc = new KubeConfig();
    kc.loadFromDefault(); // Loads from ~/.kube/config or in-cluster config

    this.k8sApi = kc.makeApiClient(CoreV1Api);
    this.k8sAppsApi = kc.makeApiClient(AppsV1Api);
    this.k8sBatchApi = kc.makeApiClient(BatchV1Api);
    this.k8sNetworkingApi = kc.makeApiClient(NetworkingV1Api);

    this.namespace = process.env.K8S_NAMESPACE || "openhive";
    this.storageBucket = process.env.K8S_STORAGE_BUCKET || "openhive-agents";
    this.registryUrl = process.env.K8S_REGISTRY_URL || "localhost:5000";
    this.registryPullUrl =
      process.env.K8S_REGISTRY_PULL_URL || this.registryUrl;
    this.registrySecretName = process.env.K8S_REGISTRY_SECRET || "regcred";

    // Storage Configuration
    this.storageType = (process.env.STORAGE_TYPE as "s3" | "local") || "s3";
    this.storagePath = process.env.STORAGE_PATH || "/var/lib/openhive/storage";
    this.storagePvcName =
      process.env.K8S_STORAGE_PVC_NAME || "openhive-storage";

    if (this.storageType === "s3") {
      // Initialize MinIO (S3 Compatible)
      this.s3Client = new S3Client({
        region: "us-east-1", // MinIO ignores this but SDK requires it
        endpoint:
          process.env.K8S_MINIO_ENDPOINT || "http://minio.openhive.svc:9000",
        credentials: {
          accessKeyId: process.env.K8S_MINIO_ACCESS_KEY || "minioadmin",
          secretAccessKey: process.env.K8S_MINIO_SECRET_KEY || "minioadmin",
        },
        forcePathStyle: true, // Required for MinIO
      });

      // Initialize MinIO Signer Client (For Pre-signed URLs)
      // Uses public endpoint if available, otherwise falls back to internal
      this.s3SignerClient = new S3Client({
        region: "us-east-1",
        endpoint:
          process.env.K8S_MINIO_PUBLIC_ENDPOINT ||
          process.env.K8S_MINIO_ENDPOINT ||
          "http://minio.openhive.svc:9000",
        credentials: {
          accessKeyId: process.env.K8S_MINIO_ACCESS_KEY || "minioadmin",
          secretAccessKey: process.env.K8S_MINIO_SECRET_KEY || "minioadmin",
        },
        forcePathStyle: true,
      });
    }
  }

  // --- Storage ---

  generateAgentKey(
    ownerId: string,
    agentName: string,
    version: string
  ): string {
    return `agents/${ownerId}/${agentName}/${version}.tar.gz`;
  }

  async deleteFile(key: string): Promise<void> {
    if (this.storageType === "local") {
      try {
        await fs.unlink(path.join(this.storagePath, key));
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          console.warn(`Failed to delete local file ${key}:`, error);
        }
      }
      return;
    }

    try {
      await this.s3Client!.send(
        new DeleteObjectCommand({
          Bucket: this.storageBucket,
          Key: key,
        })
      );
    } catch (error) {
      console.warn(`Failed to delete file ${key}:`, error);
    }
  }

  async getUploadUrl(
    key: string,
    contentType: string = "application/gzip",
    expiresIn: number = 3600
  ): Promise<string> {
    if (this.storageType === "local") {
      // key format: agents/ownerId/agentName/version.tar.gz
      const parts = key.split("/");
      const agentName = parts.length >= 3 ? parts[2] : "unknown";

      // Return URL to our own API endpoint
      // We encode the key to ensure it's safe in the URL
      return `${
        config.appUrl
      }/api/agent/${agentName}/upload?key=${encodeURIComponent(key)}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.storageBucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3SignerClient!, command, { expiresIn });
  }

  async getDownloadUrl(key: string, expiresIn: number = 300): Promise<string> {
    if (this.storageType === "local") {
      const parts = key.split("/");
      const agentName = parts.length >= 3 ? parts[2] : "unknown";

      return `${
        config.appUrl
      }/api/agent/${agentName}/download?key=${encodeURIComponent(key)}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.storageBucket,
      Key: key,
    });
    return getSignedUrl(this.s3SignerClient!, command, { expiresIn });
  }

  // --- Service Management ---

  async ensureAgentService(agentName: string): Promise<void> {
    const serviceName = `service-${agentName}`;

    try {
      await this.k8sApi.readNamespacedService({
        name: serviceName,
        namespace: this.namespace,
      });
      // Service exists
      console.log(`[K8s] Service ${serviceName} already exists.`);
    } catch (err: any) {
      if (
        err.response?.statusCode === 404 ||
        err.statusCode === 404 ||
        err.code === 404
      ) {
        console.log(`[K8s] Creating Service for ${agentName}...`);
        const service: V1Service = {
          metadata: {
            name: serviceName,
            namespace: this.namespace,
            labels: { app: agentName, type: "agent" },
          },
          spec: {
            selector: { app: agentName },
            ports: [{ port: 80, targetPort: 3000, protocol: "TCP" }],
            type: "ClusterIP",
          },
        };
        await this.k8sApi.createNamespacedService({
          namespace: this.namespace,
          body: service,
        });
        console.log(`[K8s] Service ${serviceName} created successfully.`);
      } else {
        console.error(
          `[K8s] Failed to ensure service for agent ${agentName}:`,
          err
        );
        throw err;
      }
    }
  }

  async deployAgentService(agentName: string, version: string): Promise<void> {
    const deploymentName = `agent-${agentName}`;
    const image = `${this.registryPullUrl}/${agentName}:${version}`;

    console.log(
      `[K8s] Deploying agent ${agentName} (v${version}) using image: ${image}`
    );

    // Define Deployment
    const deployment: V1Deployment = {
      metadata: {
        name: deploymentName,
        namespace: this.namespace,
        labels: { app: agentName, type: "agent" },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: agentName } },
        template: {
          metadata: { labels: { app: agentName } },
          spec: {
            imagePullSecrets: [{ name: this.registrySecretName }],
            containers: [
              {
                name: "agent",
                image: image,
                ports: [{ containerPort: 3000 }],
                env: [
                  { name: "PORT", value: "3000" },
                  { name: "AGENT_NAME", value: agentName },
                ],
                resources: {
                  requests: { cpu: "100m", memory: "128Mi" },
                  limits: { cpu: "500m", memory: "512Mi" },
                },
              },
            ],
          },
        },
      },
    };

    try {
      // Check if deployment exists
      await this.k8sAppsApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });
      console.log(`[K8s] Updating Deployment ${deploymentName}...`);
      await this.k8sAppsApi.replaceNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
        body: deployment,
      });
      console.log(`[K8s] Deployment ${deploymentName} updated successfully.`);
    } catch (err: any) {
      if (
        err.response?.statusCode === 404 ||
        err.statusCode === 404 ||
        err.code === 404
      ) {
        console.log(`[K8s] Creating Deployment ${deploymentName}...`);
        await this.k8sAppsApi.createNamespacedDeployment({
          namespace: this.namespace,
          body: deployment,
        });
        console.log(`[K8s] Deployment ${deploymentName} created successfully.`);
      } else {
        console.error(`[K8s] Failed to deploy agent ${agentName}:`, err);
        throw err;
      }
    }
  }

  async stopAgentService(agentName: string): Promise<void> {
    const deploymentName = `agent-${agentName}`;
    const serviceName = `service-${agentName}`;

    try {
      // Delete Deployment
      await this.k8sAppsApi.deleteNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });
      // Delete Service
      await this.k8sApi.deleteNamespacedService({
        name: serviceName,
        namespace: this.namespace,
      });
    } catch (err) {
      console.warn(`Error stopping agent ${agentName}:`, err);
    }
  }

  getAgentInternalUrl(agentName: string): string {
    // K8s DNS: service-name.namespace.svc.cluster.local
    return `http://service-${agentName}.${this.namespace}.svc.cluster.local`;
  }

  // --- Build System (Kaniko) ---

  async triggerAgentBuild(
    ownerId: string,
    agentName: string,
    version: string
  ): Promise<string> {
    const buildId = `build-${agentName}-${version.replace(
      /\./g,
      "-"
    )}-${Date.now()}`;
    const sourceKey = this.generateAgentKey(ownerId, agentName, version);
    const image = `${this.registryUrl}/${agentName}:${version}`;

    // We need a way to pass the source code. Kaniko supports S3 and Local Dir.

    const kanikoArgs = [
      `--dockerfile=Dockerfile`,
      `--destination=${image}`,
      `--insecure`,
      `--skip-tls-verify`,
      `--skip-tls-verify-pull`,
    ];

    const volumeMounts: V1VolumeMount[] = [
      {
        name: "registry-creds",
        mountPath: "/kaniko/.docker/",
        readOnly: true,
      },
    ];

    const volumes: V1Volume[] = [
      {
        name: "registry-creds",
        secret: {
          secretName: this.registrySecretName,
          items: [{ key: ".dockerconfigjson", path: "config.json" }],
        },
      },
    ];

    let envVars: V1EnvVar[] = [];
    let initContainers: any[] = [];

    if (this.storageType === "local") {
      // Local Storage:
      // Kaniko doesn't support extracting tarball from local file via dir:// context directly if it expects a directory.
      // So we use an init container to extract the tarball from the PVC to a shared emptyDir volume.

      const storageMountPath = "/storage";
      const contextMountPath = "/workspace/context"; // Shared volume for extracted context

      // Init Container to extract source code
      initContainers.push({
        name: "extract-source",
        image: "busybox",
        command: [
          "sh",
          "-c",
          `mkdir -p ${contextMountPath} && tar -xzf ${storageMountPath}/${sourceKey} -C ${contextMountPath}`,
        ],
        volumeMounts: [
          {
            name: "storage",
            mountPath: storageMountPath,
            readOnly: true,
          },
          {
            name: "context",
            mountPath: contextMountPath,
          },
        ],
      });

      // Kaniko uses the extracted context directory
      kanikoArgs.push(`--context=dir://${contextMountPath}`);

      // Mount the shared context volume to Kaniko
      volumeMounts.push({
        name: "context",
        mountPath: contextMountPath,
        readOnly: true,
      });

      // Define Volumes
      volumes.push({
        name: "storage",
        persistentVolumeClaim: {
          claimName: this.storagePvcName,
        },
      });
      volumes.push({
        name: "context",
        emptyDir: {},
      });
    } else {
      // S3 Storage
      kanikoArgs.push(`--context=s3://${this.storageBucket}/${sourceKey}`);

      envVars = [
        {
          name: "AWS_ACCESS_KEY_ID",
          value: process.env.K8S_MINIO_ACCESS_KEY,
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          value: process.env.K8S_MINIO_SECRET_KEY,
        },
        { name: "AWS_REGION", value: "us-east-1" },
        {
          name: "S3_ENDPOINT",
          value: process.env.K8S_MINIO_ENDPOINT,
        },
        { name: "S3_FORCE_PATH_STYLE", value: "true" },
      ];
    }

    const job: V1Job = {
      metadata: {
        name: buildId,
        namespace: this.namespace,
        labels: { app: agentName, type: "build", buildId },
      },
      spec: {
        ttlSecondsAfterFinished: 3600, // Clean up after 1 hour
        template: {
          spec: {
            restartPolicy: "Never",
            initContainers:
              initContainers.length > 0 ? initContainers : undefined,
            containers: [
              {
                name: "kaniko",
                image: "gcr.io/kaniko-project/executor:latest",
                args: kanikoArgs,
                env: envVars,
                volumeMounts: volumeMounts,
              },
            ],
            volumes: volumes,
          },
        },
      },
    };

    await this.k8sBatchApi.createNamespacedJob({
      namespace: this.namespace,
      body: job,
    });

    // In K8s, we want to "Trigger Deploy" immediately after triggering build.
    // The Deployment will attempt to pull the image and backoff until the build job finishes.
    // This mimics the behavior where a build trigger results in a deployment.
    try {
      await this.deployAgentService(agentName, version);
    } catch (err) {
      console.error(
        `[K8s] Failed to trigger deployment update for ${agentName}:`,
        err
      );
      // We don't throw here to ensure the buildId is still returned to the caller
    }

    return buildId;
  }

  async getBuildStatus(buildId: string): Promise<string> {
    try {
      const job = await this.k8sBatchApi.readNamespacedJob({
        name: buildId,
        namespace: this.namespace,
      });
      const status = job.status;

      if (status?.succeeded) return "SUCCEEDED";
      if (status?.failed) return "FAILED";
      if (status?.active) return "IN_PROGRESS";
      return "UNKNOWN";
    } catch (err) {
      console.warn(`Error getting build status for ${buildId}:`, err);
      return "UNKNOWN";
    }
  }

  // --- Environment ---

  async getAgentEnvironment(
    agentName: string
  ): Promise<Record<string, string>> {
    const deploymentName = `agent-${agentName}`;
    try {
      const deploy = await this.k8sAppsApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });
      const envs = deploy.spec?.template.spec?.containers[0].env || [];

      return envs.reduce((acc: Record<string, string>, env: V1EnvVar) => {
        if (env.name && env.value) acc[env.name] = env.value;
        return acc;
      }, {} as Record<string, string>);
    } catch (err) {
      console.warn(`Error getting agent environment for ${agentName}:`, err);
      return {};
    }
  }

  async updateAgentEnvironment(
    agentName: string,
    envVars: Record<string, string>
  ): Promise<void> {
    const deploymentName = `agent-${agentName}`;
    const newEnvs: V1EnvVar[] = Object.entries(envVars).map(
      ([name, value]) => ({ name, value })
    );

    // Get current deployment to preserve other settings
    const deploy = await this.k8sAppsApi.readNamespacedDeployment({
      name: deploymentName,
      namespace: this.namespace,
    });
    const container = deploy.spec?.template.spec?.containers[0];

    if (container && deploy) {
      // Merge with existing envs or replace? Usually replace specific keys.
      // For simplicity, we'll replace the list but ensure mandatory ones are kept if needed.
      // Or better: implementation expects full set?
      // The interface implies "update", usually meaning "set these".
      // Let's assume we replace the environment list but keep system ones if any.

      container.env = newEnvs;
      await this.k8sAppsApi.replaceNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
        body: deploy,
      });
    }
  }

  // --- Observability ---

  async getServiceStatus(agentName: string): Promise<ServiceStatus> {
    const deploymentName = `agent-${agentName}`;
    try {
      const deploy = await this.k8sAppsApi.readNamespacedDeployment({
        name: deploymentName,
        namespace: this.namespace,
      });
      const status = deploy.status;

      return {
        status: (status?.readyReplicas || 0) > 0 ? "RUNNING" : "STOPPED",
        desiredCount: status?.replicas,
        runningCount: status?.readyReplicas || 0,
        pendingCount: (status?.replicas || 0) - (status?.readyReplicas || 0),
      };
    } catch (err) {
      console.warn(`Error getting service status for ${agentName}:`, err);
      return { status: "UNKNOWN" };
    }
  }

  async getServiceStatuses(
    agentNames: string[]
  ): Promise<Record<string, ServiceStatus>> {
    const result: Record<string, ServiceStatus> = {};
    for (const name of agentNames) {
      result[name] = await this.getServiceStatus(name);
    }
    return result;
  }

  async getAgentLogs(agentName: string, limit: number = 100): Promise<any[]> {
    // Find pods for the agent
    try {
      const pods = await this.k8sApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: `app=${agentName}`,
      });

      if (pods.items.length === 0) return [];

      // Get logs from first pod
      const podName = pods.items[0].metadata?.name;
      if (!podName) return [];

      const logs = await this.k8sApi.readNamespacedPodLog({
        name: podName,
        namespace: this.namespace,
        container: "agent",
        tailLines: limit,
      });

      // Parse logs (Kubernetes returns a single string)
      return (logs as string)
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
          message: line,
          timestamp: new Date().toISOString(), // K8s logs via API don't easily give timestamps per line without strict parsing
        }));
    } catch (err) {
      console.warn(`Error getting agent logs for ${agentName}:`, err);
      return [];
    }
  }
}
