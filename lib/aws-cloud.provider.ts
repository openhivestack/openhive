import {
  CloudProvider,
  AgentTask,
  AgentMetrics,
  LogEvent,
} from "./cloud-provider.interface";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  ECSClient,
  DescribeServicesCommand,
  RegisterTaskDefinitionCommand,
  CreateServiceCommand,
  UpdateServiceCommand,
  DeleteServiceCommand,
} from "@aws-sdk/client-ecs";
import {
  ServiceDiscoveryClient,
  CreateServiceCommand as CreateSDServiceCommand,
  ListServicesCommand,
} from "@aws-sdk/client-servicediscovery";

export class AwsCloudProvider implements CloudProvider {
  private s3: S3Client;
  private codebuild: CodeBuildClient;
  private ecs: ECSClient;
  private sd: ServiceDiscoveryClient;
  private logs: CloudWatchLogsClient;
  private bucket: string;
  private project: string;
  private cluster: string;
  private executionRoleArn: string;
  private subnets: string[];
  private securityGroups: string[];
  private ecrBaseUrl: string;
  private cloudMapNamespaceId: string;
  private gatewayUrl: string;
  private cloudMapNamespaceName: string;

  constructor() {
    this.s3 = new S3Client({ region: process.env.AWS_REGION });
    this.codebuild = new CodeBuildClient({ region: process.env.AWS_REGION });
    this.ecs = new ECSClient({ region: process.env.AWS_REGION });
    this.sd = new ServiceDiscoveryClient({ region: process.env.AWS_REGION });
    this.logs = new CloudWatchLogsClient({ region: process.env.AWS_REGION });

    this.bucket = process.env.AWS_AGENT_SOURCES_BUCKET as string;
    this.project = process.env.AWS_CODEBUILD_PROJECT as string;
    this.cluster = process.env.AWS_ECS_CLUSTER as string;
    this.executionRoleArn = process.env.AWS_ECS_EXECUTION_ROLE_ARN as string;
    this.subnets = (process.env.AWS_VPC_SUBNETS || "").split(",");
    this.securityGroups = (process.env.AWS_SECURITY_GROUPS || "").split(",");
    this.ecrBaseUrl = process.env.AWS_ECR_REPOSITORY_URL as string;
    this.cloudMapNamespaceId =
      process.env.AWS_CLOUD_MAP_NAMESPACE_ID || "ns-xxxxxxxx"; // Should be provided
    this.cloudMapNamespaceName =
      process.env.AWS_CLOUD_MAP_NAMESPACE_NAME || "openhive-dev.local";
    this.gatewayUrl = process.env.GATEWAY_URL as string;
  }

  async uploadSource(
    agentId: string,
    version: string,
    file: Buffer
  ): Promise<string> {
    const key = `agents/${agentId}/${version}/source.tar.gz`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
      })
    );
    return `s3://${this.bucket}/${key}`;
  }

  async deployAgent(
    agentId: string,
    version: string,
    sourceUrl: string,
    envVars: Record<string, string>
  ): Promise<void> {
    // 1. Trigger CodeBuild
    const s3Url = new URL(sourceUrl);
    const sourceBucket = s3Url.hostname;
    const sourceKey = s3Url.pathname.substring(1);

    await this.codebuild.send(
      new StartBuildCommand({
        projectName: this.project,
        environmentVariablesOverride: [
          { name: "SOURCE_BUCKET", value: sourceBucket },
          { name: "SOURCE_KEY", value: sourceKey },
          { name: "AGENT_NAME", value: agentId },
          { name: "AGENT_VERSION", value: version },
        ],
      })
    );

    // 2. Ensure Cloud Map Service Exists
    let registryArn: string | undefined;
    if (this.cloudMapNamespaceId) {
      try {
        // Check if service exists
        const list = await this.sd.send(
          new ListServicesCommand({
            Filters: [
              { Name: "NAMESPACE_ID", Values: [this.cloudMapNamespaceId] },
            ],
          })
        );
        const existing = list.Services?.find((s) => s.Name === agentId);

        if (existing) {
          registryArn = existing.Arn;
        } else {
          // Create Service
          const created = await this.sd.send(
            new CreateSDServiceCommand({
              Name: agentId,
              NamespaceId: this.cloudMapNamespaceId,
              DnsConfig: {
                DnsRecords: [
                  {
                    Type: "A",
                    TTL: 60,
                  },
                ],
              },
              HealthCheckCustomConfig: {
                FailureThreshold: 1,
              },
            })
          );
          registryArn = created.Service?.Arn;
        }
      } catch (error) {
        console.error("Failed to setup Cloud Map service:", error);
        // Continue without internal DNS if failing (though internal URL will fail)
      }
    }

    // 3. ECS Service & Task Definition
    const serviceName = `service-${agentId}`;
    const imageUri = `${this.ecrBaseUrl}:${agentId}-${version}`;

    const taskDef = await this.ecs.send(
      new RegisterTaskDefinitionCommand({
        family: agentId,
        cpu: "256",
        memory: "512",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: this.executionRoleArn,
        containerDefinitions: [
          {
            name: "agent",
            image: imageUri,
            essential: true,
            portMappings: [
              {
                containerPort: 4000,
                protocol: "tcp",
              },
            ],
            environment: [
              ...Object.entries(envVars).map(([name, value]) => ({
                name,
                value,
              })),
              { name: "PORT", value: "4000" }, // Ensure agent listens on 4000
            ],
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-group": "/ecs/openhive-agents",
                "awslogs-region": process.env.AWS_REGION || "us-east-1",
                "awslogs-stream-prefix": agentId,
                "awslogs-create-group": "true",
              },
            },
          },
        ],
      })
    );

    const taskDefArn = taskDef.taskDefinition?.taskDefinitionArn;
    if (!taskDefArn) {
      throw new Error("Failed to register task definition");
    }

    // Check if Service Exists
    const describe = await this.ecs.send(
      new DescribeServicesCommand({
        cluster: this.cluster,
        services: [serviceName],
      })
    );

    const existingService = describe.services?.find(
      (s) => s.status === "ACTIVE" || s.status === "DRAINING"
    );

    const serviceRegistries = registryArn
      ? [{ registryArn: registryArn }]
      : undefined;

    if (!existingService) {
      // Create Service
      await this.ecs.send(
        new CreateServiceCommand({
          cluster: this.cluster,
          serviceName: serviceName,
          taskDefinition: taskDefArn,
          desiredCount: 1,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: this.subnets,
              securityGroups: this.securityGroups,
              assignPublicIp: "ENABLED",
            },
          },
          serviceRegistries,
        })
      );
    } else {
      // Check if existing service has the correct serviceRegistries
      // ECS Service description includes serviceRegistries array.
      // If the existing service doesn't have our registryArn, we must recreate it.
      const currentRegistries = existingService.serviceRegistries || [];
      const hasRegistry = currentRegistries.some(
        (r) => r.registryArn === registryArn
      );

      if (registryArn && !hasRegistry) {
        console.log(
          `Service ${serviceName} exists but is missing Service Registry. Recreating...`
        );
        // 1. Update desired count to 0 (optional, but good practice before delete)
        await this.ecs.send(
          new UpdateServiceCommand({
            cluster: this.cluster,
            service: serviceName,
            desiredCount: 0,
          })
        );

        // 2. Delete Service
        await this.ecs.send(
          new DeleteServiceCommand({
            cluster: this.cluster,
            service: serviceName,
          })
        );

        // 3. Wait for service to drain
        // We need to wait until the service is fully deleted or at least inactive
        console.log(`Waiting for service ${serviceName} to drain...`);
        let isDrained = false;
        for (let i = 0; i < 30; i++) {
          // Wait up to 60s
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const check = await this.ecs.send(
            new DescribeServicesCommand({
              cluster: this.cluster,
              services: [serviceName],
            })
          );
          const s = check.services?.[0];
          if (!s || s.status === "INACTIVE") {
            isDrained = true;
            break;
          }
        }

        if (!isDrained) {
          // If it's still draining, we might fail to create.
          // However, ECS usually allows recreating a service with the same name once the old one is INACTIVE or Draining (if force new deployment?)
          // Actually, you can't have two services with same name.
          // If it's still draining, we probably can't create.
          console.warn(
            `Service ${serviceName} is still draining. Attempting creation anyway...`
          );
        }

        await this.ecs.send(
          new CreateServiceCommand({
            cluster: this.cluster,
            serviceName: serviceName,
            taskDefinition: taskDefArn,
            desiredCount: 1,
            launchType: "FARGATE",
            networkConfiguration: {
              awsvpcConfiguration: {
                subnets: this.subnets,
                securityGroups: this.securityGroups,
                assignPublicIp: "ENABLED",
              },
            },
            serviceRegistries,
          })
        );
      } else {
        // Update existing service (Standard update)
        await this.ecs.send(
          new UpdateServiceCommand({
            cluster: this.cluster,
            service: serviceName,
            taskDefinition: taskDefArn,
            forceNewDeployment: true,
          })
        );
      }
    }
  }

  async getAgentStatus(
    agentId: string
  ): Promise<"BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "UNKNOWN"> {
    try {
      const serviceName = `service-${agentId}`;
      const res = await this.ecs.send(
        new DescribeServicesCommand({
          cluster: this.cluster,
          services: [serviceName],
        })
      );

      const service = res.services?.[0];
      if (!service) return "UNKNOWN";

      if (service.status === "ACTIVE" && (service.runningCount || 0) > 0)
        return "RUNNING";
      if (service.status === "DRAINING") return "STOPPED";

      return "BUILDING";
    } catch (e) {
      console.error(e);
      return "UNKNOWN";
    }
  }

  async getAgentLogs(agentId: string): Promise<LogEvent[]> {
    try {
      const command = new FilterLogEventsCommand({
        logGroupName: "/ecs/openhive-agents",
        logStreamNamePrefix: agentId,
        limit: 100, // Fetch last 100 lines
        startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      });

      const response = await this.logs.send(command);

      if (!response.events) return [];

      return response.events
        .map((e) => ({
          timestamp: e.timestamp || Date.now(),
          message: e.message || "",
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (e) {
      console.error("Error fetching logs:", e);
      return [];
    }
  }

  async getAgentUrl(agentId: string): Promise<string | null> {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    if (!appUrl) return null;
    return `${appUrl}/api/agent/${agentId}`;
  }

  async getInternalAgentUrl(agentId: string): Promise<string | null> {
    if (this.gatewayUrl) {
      // Remove trailing slash if present
      const baseUrl = this.gatewayUrl.replace(/\/$/, "");
      return `${baseUrl}/${agentId}`;
    }

    // Fallback to internal DNS if no proxy configured
    return `http://${agentId}.openhive.local:3000`;
  }

  async getAgentTasks(agentId: string, limit = 10): Promise<AgentTask[]> {
    try {
      // Attempt to fetch logs that look like task completions
      // We look for "status-update" and "completed"
      const command = new FilterLogEventsCommand({
        logGroupName: "/ecs/openhive-agents",
        logStreamNamePrefix: agentId,
        filterPattern:
          '{ $.kind = "status-update" && $.status.state = "completed" }',
        limit: limit,
      });

      const response = await this.logs.send(command);

      if (!response.events) return [];

      return response.events.map((event) => {
        try {
          const data = JSON.parse(event.message || "{}");
          return {
            taskId: data.taskId || "unknown",
            status: data.status?.state || "completed",
            startTime:
              data.status?.timestamp ||
              new Date(event.timestamp || Date.now()).toISOString(),
            endTime: data.status?.timestamp,
            agentVersion: "latest",
          };
        } catch {
          return {
            taskId: "unknown",
            status: "unknown",
            startTime: new Date(event.timestamp || Date.now()).toISOString(),
            agentVersion: "unknown",
          };
        }
      });
    } catch (error) {
      console.error("Error fetching agent tasks logs:", error);
      return [];
    }
  }

  async getAgentMetrics(agentId: string, range: string): Promise<AgentMetrics> {
    // Mock implementation for now as we don't have a dedicated metrics store
    // In a real implementation, this would query CloudWatch Metrics or aggregate logs
    return {
      totalExecutions: 0,
      successRate: 0,
      avgDurationMs: 0,
      errorCount: 0,
      timeSeries: [],
    };
  }
}
