import { CloudProvider } from "./cloud-provider.interface";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";
import {
  ECSClient,
  DescribeServicesCommand,
  RegisterTaskDefinitionCommand,
  CreateServiceCommand,
  UpdateServiceCommand,
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
            environment: Object.entries(envVars).map(([name, value]) => ({
              name,
              value,
            })),
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
      // Update existing service
      await this.ecs.send(
        new UpdateServiceCommand({
          cluster: this.cluster,
          service: serviceName,
          taskDefinition: taskDefArn,
          forceNewDeployment: true,
          // serviceRegistries cannot be updated in UpdateService, only created.
          // If it was missing, we'd need to destroy/create, but we assume it stays consistent.
        })
      );
    }
  }

  async getAgentStatus(
    agentId: string
  ): Promise<"BUILDING" | "RUNNING" | "STOPPED" | "FAILED" | "UNKNOWN"> {
    try {
      const res = await this.ecs.send(
        new DescribeServicesCommand({
          cluster: this.cluster,
          services: [agentId],
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

  async getAgentLogs(agentId: string): Promise<string[]> {
    console.log(agentId);
    return ["Logs not implemented in this demo"];
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
}
