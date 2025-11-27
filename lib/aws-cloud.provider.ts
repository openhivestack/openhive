import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  CodeBuildClient,
  StartBuildCommand,
  BatchGetBuildsCommand,
} from "@aws-sdk/client-codebuild";
import {
  ECSClient,
  CreateServiceCommand,
  UpdateServiceCommand,
  RegisterTaskDefinitionCommand,
  DeleteServiceCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
  DescribeTaskDefinitionCommand,
} from "@aws-sdk/client-ecs";
import {
  ServiceDiscoveryClient,
  CreateServiceCommand as CreateSDServiceCommand,
  ListServicesCommand,
} from "@aws-sdk/client-servicediscovery";
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CloudProvider, ServiceStatus } from "./cloud-provider.interface";

export class AwsCloudProvider implements CloudProvider {
  private s3Client: S3Client;
  private codeBuildClient: CodeBuildClient;
  private ecsClient: ECSClient;
  private sdClient: ServiceDiscoveryClient;
  private logsClient: CloudWatchLogsClient;

  private bucket: string;
  private cluster: string;
  private buildProject: string;
  private ecrRepoUrl: string;
  private executionRoleArn: string;
  private securityGroupId: string;
  private subnets: string[];
  private namespaceId: string;
  private region: string;

  // Proxy Config
  private proxyUrl: string;

  constructor() {
    this.region = process.env.AWS_REGION || "us-east-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Config
    this.bucket = process.env.AWS_AGENT_SOURCES_BUCKET || "";
    this.cluster = process.env.AWS_ECS_CLUSTER || "";
    this.buildProject = process.env.AWS_CODEBUILD_PROJECT || "";
    this.ecrRepoUrl = process.env.AWS_ECR_REPO_URL || "";
    this.executionRoleArn = process.env.AWS_EXECUTION_ROLE_ARN || "";
    this.securityGroupId = process.env.AWS_SECURITY_GROUP_ID || "";
    this.subnets = (process.env.AWS_SUBNETS || "").split(",").filter(Boolean);
    this.namespaceId = process.env.AWS_CLOUD_MAP_NAMESPACE_ID || "";

    // e.g. http://openhive-alb-123456.us-east-1.elb.amazonaws.com
    this.proxyUrl = process.env.AWS_PROXY_URL || "";

    if (!this.region || !accessKeyId || !secretAccessKey) {
      console.warn("Missing AWS credentials or region configuration.");
    }

    const credentials = {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    };

    this.s3Client = new S3Client({
      region: this.region,
      credentials,
      forcePathStyle: false,
    });
    this.codeBuildClient = new CodeBuildClient({
      region: this.region,
      credentials,
    });
    this.ecsClient = new ECSClient({ region: this.region, credentials });
    this.sdClient = new ServiceDiscoveryClient({
      region: this.region,
      credentials,
    });
    this.logsClient = new CloudWatchLogsClient({
      region: this.region,
      credentials,
    });
  }

  /**
   * Generates a standardized S3 key for an agent version artifact.
   */
  generateAgentKey(
    ownerId: string,
    agentName: string,
    version: string
  ): string {
    return `agents/${ownerId}/${agentName}/${version}.tar.gz`;
  }

  /**
   * Deletes an object from S3.
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.bucket) {
      throw new Error("AWS_AGENT_SOURCES_BUCKET is not defined");
    }
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (error) {
      console.warn(
        `Failed to delete S3 object ${key}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generates a pre-signed URL for uploading a file (PUT).
   */
  async getUploadUrl(
    key: string,
    contentType: string = "application/gzip",
    expiresIn: number = 3600
  ): Promise<string> {
    if (!this.bucket) {
      throw new Error("AWS_AGENT_SOURCES_BUCKET is not defined");
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn,
      signableHeaders: new Set(["content-type"]),
    });
  }

  /**
   * Generates a pre-signed URL for downloading a file (GET).
   */
  async getDownloadUrl(key: string, expiresIn: number = 300): Promise<string> {
    if (!this.bucket) {
      throw new Error("AWS_AGENT_SOURCES_BUCKET is not defined");
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn,
    });
  }

  // --- Deployment Methods ---

  /**
   * Ensures the ECS service exists for the agent.
   * If it doesn't exist, it creates it with a placeholder or existing task definition.
   * This is called before triggering a build to ensure the infrastructure is ready.
   */
  async ensureAgentService(agentName: string, version: string): Promise<void> {
    const serviceName = `service-${agentName}`;

    // 1. Check if service exists
    const describe = await this.ecsClient.send(
      new DescribeServicesCommand({
        cluster: this.cluster,
        services: [serviceName],
      })
    );

    const existingService = describe.services?.find(
      (s: any) => s.serviceName === serviceName && s.status !== "INACTIVE"
    );

    if (existingService) {
      console.log(`Service ${serviceName} already exists.`);
      return;
    }

    console.log(
      `Service ${serviceName} not found. Creating initial service infrastructure...`
    );

    // 2. We need a task definition to create the service.
    // Since the image might not exist yet (we are about to build it),
    // we have a chicken-and-egg problem.
    // Strategy: Create the Task Definition assuming the image WILL exist at the standard tag.
    // ECS allows registering a Task Def with an image that doesn't exist yet (it only fails when trying to RUN it).

    const image = `${this.ecrRepoUrl}:${agentName}-${version}`;
    const family = `agent-${agentName}`;

    const registerTaskCmd = new RegisterTaskDefinitionCommand({
      family: family,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "256",
      memory: "512",
      executionRoleArn: this.executionRoleArn,
      containerDefinitions: [
        {
          name: "agent",
          image: image,
          essential: true,
          portMappings: [
            { containerPort: 3000, hostPort: 3000, protocol: "tcp" },
          ],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": "/ecs/openhive-agents",
              "awslogs-region": this.region,
              "awslogs-stream-prefix": "ecs",
            },
          },
          environment: [
            { name: "PORT", value: "3000" },
            { name: "AGENT_NAME", value: agentName },
          ],
        },
      ],
    });

    const taskDef = await this.ecsClient.send(registerTaskCmd);
    const taskDefArn = taskDef.taskDefinition?.taskDefinitionArn;

    if (!taskDefArn)
      throw new Error("Failed to register initial task definition");

    // 3. Create Cloud Map Service Registry
    const registryArn = await this.ensureServiceRegistry(agentName);

    // 4. Create the Service
    // We set desiredCount to 0 initially so it doesn't try to start tasks
    // with the potentially missing image until the build finishes.
    // The CodeBuild "post_build" script or a subsequent update will scale it up.
    // Wait, actually, we want it to be ready. CodeBuild updates the service with force-new-deployment.
    // If we set count to 1, it will try to pull the image and fail until the build finishes.
    // Let's set it to 0, and let the CodeBuild script update the service (which it does).
    // BUT: The CodeBuild script uses `update-service --force-new-deployment`.
    // Does that change desiredCount? No.
    // So we should set desiredCount to 1 here?
    // If we set to 1, ECS keeps retrying. Once image is pushed, it succeeds. This is acceptable.

    await this.ecsClient.send(
      new CreateServiceCommand({
        cluster: this.cluster,
        serviceName: serviceName,
        taskDefinition: taskDefArn,
        desiredCount: 1,
        launchType: "FARGATE",
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: this.subnets,
            securityGroups: [this.securityGroupId],
            assignPublicIp: "DISABLED",
          },
        },
        serviceRegistries: registryArn ? [{ registryArn }] : undefined,
      })
    );

    console.log(`Service ${serviceName} created successfully.`);
  }

  /**
   * Triggers a CodeBuild build to create the Docker image for the agent.
   */
  async triggerAgentBuild(
    ownerId: string,
    agentName: string,
    version: string
  ): Promise<string> {
    if (!this.buildProject)
      throw new Error("AWS_CODEBUILD_PROJECT is not configured");

    const sourceKey = this.generateAgentKey(ownerId, agentName, version);

    const command = new StartBuildCommand({
      projectName: this.buildProject,
      environmentVariablesOverride: [
        { name: "SOURCE_BUCKET", value: this.bucket },
        { name: "SOURCE_KEY", value: sourceKey },
        { name: "AGENT_NAME", value: agentName },
        { name: "AGENT_VERSION", value: version },
      ],
    });

    const response = await this.codeBuildClient.send(command);
    return response.build?.id || "";
  }

  /**
   * Checks the status of a build.
   */
  async getBuildStatus(buildId: string): Promise<string> {
    const command = new BatchGetBuildsCommand({ ids: [buildId] });
    const response = await this.codeBuildClient.send(command);
    return response.builds?.[0]?.buildStatus || "UNKNOWN";
  }

  /**
   * Deploys the agent to ECS Fargate.
   * Should be called after the build is SUCCEEDED.
   */
  async deployAgentService(agentName: string, version: string): Promise<void> {
    if (!this.cluster || !this.ecrRepoUrl || !this.executionRoleArn) {
      throw new Error("Missing ECS configuration");
    }

    const image = `${this.ecrRepoUrl}:${agentName}-${version}`;
    const family = `agent-${agentName}`;
    const serviceName = `service-${agentName}`;

    // 1. Register Task Definition
    const registerTaskCmd = new RegisterTaskDefinitionCommand({
      family: family,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "256",
      memory: "512",
      executionRoleArn: this.executionRoleArn,
      containerDefinitions: [
        {
          name: "agent",
          image: image,
          essential: true,
          portMappings: [
            { containerPort: 3000, hostPort: 3000, protocol: "tcp" },
          ],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": "/ecs/openhive-agents", // Must match Terraform
              "awslogs-region": this.region,
              "awslogs-stream-prefix": "ecs",
            },
          },
          environment: [
            { name: "PORT", value: "3000" },
            { name: "AGENT_NAME", value: agentName },
          ],
        },
      ],
    });

    const taskDef = await this.ecsClient.send(registerTaskCmd);
    const taskDefArn = taskDef.taskDefinition?.taskDefinitionArn;

    if (!taskDefArn) throw new Error("Failed to register task definition");

    // 2. Create or Update Service
    try {
      // Check if service exists by describing it
      const describe = await this.ecsClient.send(
        new DescribeServicesCommand({
          cluster: this.cluster,
          services: [serviceName],
        })
      );

      const existingService = describe.services?.find(
        (s: any) => s.serviceName === serviceName && s.status !== "INACTIVE"
      );

      if (existingService) {
        console.log(`Updating existing service ${serviceName}...`);
        await this.ecsClient.send(
          new UpdateServiceCommand({
            cluster: this.cluster,
            service: serviceName,
            taskDefinition: taskDefArn,
          })
        );
      } else {
        console.log(`Creating new service ${serviceName}...`);
        // Get or Create Cloud Map Service Registry
        const registryArn = await this.ensureServiceRegistry(agentName);

        await this.ecsClient.send(
          new CreateServiceCommand({
            cluster: this.cluster,
            serviceName: serviceName,
            taskDefinition: taskDefArn,
            desiredCount: 1,
            launchType: "FARGATE",
            networkConfiguration: {
              awsvpcConfiguration: {
                subnets: this.subnets,
                securityGroups: [this.securityGroupId],
                assignPublicIp: "DISABLED",
              },
            },
            serviceRegistries: registryArn ? [{ registryArn }] : undefined,
          })
        );
      }
    } catch (error) {
      console.error("Failed to deploy service:", error);
      throw error;
    }
  }

  /**
   * Ensures a Service Discovery service exists for the agent.
   */
  private async ensureServiceRegistry(
    agentName: string
  ): Promise<string | undefined> {
    if (!this.namespaceId) return undefined;

    // Check if exists
    const listCmd = new ListServicesCommand({
      Filters: [{ Name: "NAMESPACE_ID", Values: [this.namespaceId] }],
    });

    const list = await this.sdClient.send(listCmd);
    const existing = list.Services?.find((s: any) => s.Name === agentName);

    if (existing) return existing.Arn;

    // Create new
    const createCmd = new CreateSDServiceCommand({
      Name: agentName,
      NamespaceId: this.namespaceId,
      DnsConfig: {
        DnsRecords: [{ Type: "A", TTL: 60 }],
        RoutingPolicy: "MULTIVALUE",
      },
      HealthCheckCustomConfig: {
        FailureThreshold: 1,
      },
    });

    const result = await this.sdClient.send(createCmd);
    return result.Service?.Arn; // Note: this might return OperationId if async
  }

  /**
   * Stops and deletes an agent service.
   */
  async stopAgentService(agentName: string): Promise<void> {
    const serviceName = `service-${agentName}`;
    // Set desired count to 0 first
    await this.ecsClient.send(
      new UpdateServiceCommand({
        cluster: this.cluster,
        service: serviceName,
        desiredCount: 0,
      })
    );

    // Then delete
    await this.ecsClient.send(
      new DeleteServiceCommand({
        cluster: this.cluster,
        service: serviceName,
      })
    );
  }

  /**
   * Returns the proxy URL for the agent.
   * If AWS_PROXY_URL is set (e.g. ALB DNS), returns http://ALB_URL/agentName
   * Otherwise returns the internal DNS (for when OpenHive is inside VPC).
   */
  getAgentInternalUrl(agentName: string): string {
    if (this.proxyUrl) {
      // Remove trailing slash if present
      const baseUrl = this.proxyUrl.replace(/\/$/, "");
      return `${baseUrl}/${agentName}`;
    }

    // Fallback to internal DNS if no proxy configured
    return `http://${agentName}.openhive.local:3000`;
  }

  // --- Observability Methods ---

  /**
   * Gets the current status of the agent service and its tasks.
   */
  async getServiceStatus(agentName: string): Promise<ServiceStatus> {
    const serviceName = `service-${agentName}`;

    try {
      const describe = await this.ecsClient.send(
        new DescribeServicesCommand({
          cluster: this.cluster,
          services: [serviceName],
        })
      );

      const service = describe.services?.[0];
      if (!service || service.status === "INACTIVE") {
        return { status: "UNKNOWN" }; // Or NOT_FOUND
      }

      // Get tasks
      const listTasks = await this.ecsClient.send(
        new ListTasksCommand({
          cluster: this.cluster,
          serviceName: serviceName,
        })
      );

      const taskArns = listTasks.taskArns || [];
      let tasks: any[] = [];

      if (taskArns.length > 0) {
        const describeTasks = await this.ecsClient.send(
          new DescribeTasksCommand({
            cluster: this.cluster,
            tasks: taskArns,
          })
        );
        tasks = describeTasks.tasks || [];
      }

      return {
        status: service.status === "ACTIVE" ? "RUNNING" : "UNKNOWN",
        runningCount: service.runningCount,
        pendingCount: service.pendingCount,
        desiredCount: service.desiredCount,
        deployments: service.deployments,
        tasks: tasks.map((t) => ({
          taskArn: t.taskArn,
          lastStatus: t.lastStatus,
          healthStatus: t.healthStatus,
          createdAt: t.createdAt,
          startedAt: t.startedAt,
          stoppedAt: t.stoppedAt,
          stoppedReason: t.stoppedReason,
        })),
      };
    } catch (error) {
      console.error(`Failed to get status for ${agentName}:`, error);
      return { status: "ERROR", error: (error as Error).message };
    }
  }

  /**
   * Gets statuses for multiple agents in bulk.
   */
  async getServiceStatuses(
    agentNames: string[]
  ): Promise<Record<string, ServiceStatus>> {
    if (agentNames.length === 0) return {};

    // ECS DescribeServices supports up to 10 services per call
    const chunks = [];
    for (let i = 0; i < agentNames.length; i += 10) {
      chunks.push(agentNames.slice(i, i + 10));
    }

    const results: Record<string, ServiceStatus> = {};

    for (const chunk of chunks) {
      const serviceNames = chunk.map((name) => `service-${name}`);
      try {
        const describe = await this.ecsClient.send(
          new DescribeServicesCommand({
            cluster: this.cluster,
            services: serviceNames,
          })
        );

        describe.services?.forEach((service) => {
          // Extract agent name from service name "service-agentName"
          const agentName = service.serviceName!.replace("service-", "");
          let status: ServiceStatus["status"] = "UNKNOWN";
          if (service.status === "ACTIVE") {
            status = "RUNNING";
          } else if (service.status === "INACTIVE") {
            status = "STOPPED";
          } else {
            status = "UNKNOWN";
          }
          results[agentName] = {
            status,
            desiredCount: service.desiredCount,
            runningCount: service.runningCount,
            pendingCount: service.pendingCount,
          };
        });

        // Mark services not found in the response as STOPPED/NOT_FOUND
        chunk.forEach((agentName) => {
          if (!results[agentName]) {
            results[agentName] = { status: "STOPPED" };
          }
        });
      } catch (error) {
        console.error(`Failed to describe services chunk:`, error);
      }
    }

    return results;
  }

  /**
   * Gets the latest logs for the agent.
   */
  async getAgentLogs(agentName: string, limit: number = 100): Promise<any[]> {
    const serviceName = `service-${agentName}`;

    try {
      // 1. Find the running task ARN
      const listTasks = await this.ecsClient.send(
        new ListTasksCommand({
          cluster: this.cluster,
          serviceName: serviceName,
          desiredStatus: "RUNNING",
          maxResults: 1,
        })
      );

      const taskArn = listTasks.taskArns?.[0];

      if (!taskArn) {
        // If no running task, check for stopped tasks to see why it failed
        const listStoppedTasks = await this.ecsClient.send(
          new ListTasksCommand({
            cluster: this.cluster,
            serviceName: serviceName,
            desiredStatus: "STOPPED",
            maxResults: 1,
          })
        );
        const stoppedTaskArn = listStoppedTasks.taskArns?.[0];
        if (stoppedTaskArn) {
          // Use the stopped task for logs
          return this.fetchLogsForTask(stoppedTaskArn, limit);
        }
        return []; // No tasks found
      }

      return this.fetchLogsForTask(taskArn, limit);
    } catch (error) {
      console.error(`Failed to get logs for ${agentName}:`, error);
      return [];
    }
  }

  private async fetchLogsForTask(taskArn: string, limit: number) {
    // Extract Task ID from ARN
    // ARN format: arn:aws:ecs:region:account:task/cluster/task-id
    const parts = taskArn.split("/");
    const taskId = parts[parts.length - 1];

    // Construct Stream Name: prefix/container/taskId
    // Prefix: ecs, Container: agent
    const logStreamName = `ecs/agent/${taskId}`;

    try {
      const command = new GetLogEventsCommand({
        logGroupName: "/ecs/openhive-agents",
        logStreamName: logStreamName,
        limit: limit,
        startFromHead: false, // Get latest logs (tail)
      });

      const response = await this.logsClient.send(command);
      return (
        response.events?.map((e) => ({
          timestamp: e.timestamp,
          message: e.message,
        })) || []
      );
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        console.log(`Log stream ${logStreamName} not found yet.`);
        return [];
      }
      console.error(`Error fetching logs stream ${logStreamName}:`, error);
      throw error;
    }
  }

  /**
   * Gets the current environment variables for the agent service.
   */
  async getAgentEnvironment(agentName: string): Promise<Record<string, string>> {
    const serviceName = `service-${agentName}`;

    try {
      // 1. Get service to find current task definition
      const describeService = await this.ecsClient.send(
        new DescribeServicesCommand({
          cluster: this.cluster,
          services: [serviceName],
        })
      );

      const service = describeService.services?.[0];
      if (!service || !service.taskDefinition) {
        return {};
      }

      // 2. Get Task Definition
      const describeTaskDef = await this.ecsClient.send(
        new DescribeTaskDefinitionCommand({
          taskDefinition: service.taskDefinition,
        })
      );

      const containerDef =
        describeTaskDef.taskDefinition?.containerDefinitions?.find(
          (c) => c.name === "agent"
        );

      if (!containerDef || !containerDef.environment) {
        return {};
      }

      // Convert array [{name, value}] to object {name: value}
      const envVars: Record<string, string> = {};
      containerDef.environment.forEach((e) => {
        if (e.name && e.value) {
          envVars[e.name] = e.value;
        }
      });

      return envVars;
    } catch (error) {
      console.error(`Failed to get environment for ${agentName}:`, error);
      return {};
    }
  }

  /**
   * Updates the environment variables for the agent service.
   * This creates a new task definition revision and updates the service.
   */
  async updateAgentEnvironment(
    agentName: string,
    envVars: Record<string, string>
  ): Promise<void> {
    const serviceName = `service-${agentName}`;

    try {
      // 1. Get current service and task definition
      const describeService = await this.ecsClient.send(
        new DescribeServicesCommand({
          cluster: this.cluster,
          services: [serviceName],
        })
      );

      const service = describeService.services?.[0];
      if (!service || !service.taskDefinition) {
        throw new Error("Service or task definition not found");
      }

      const describeTaskDef = await this.ecsClient.send(
        new DescribeTaskDefinitionCommand({
          taskDefinition: service.taskDefinition,
        })
      );

      const taskDef = describeTaskDef.taskDefinition;
      if (!taskDef) {
        throw new Error("Task definition details not found");
      }

      // 2. Prepare new container definition with updated env vars
      // Convert object {name: value} to array [{name, value}]
      const newEnv = Object.entries(envVars).map(([name, value]) => ({
        name,
        value,
      }));

      const newContainerDefs = taskDef.containerDefinitions?.map((c) => {
        if (c.name === "agent") {
          return {
            ...c,
            environment: newEnv,
          };
        }
        return c;
      });

      // 3. Register new Task Definition
      const registerTaskCmd = new RegisterTaskDefinitionCommand({
        family: taskDef.family,
        networkMode: taskDef.networkMode,
        requiresCompatibilities: taskDef.requiresCompatibilities,
        cpu: taskDef.cpu,
        memory: taskDef.memory,
        executionRoleArn: taskDef.executionRoleArn,
        taskRoleArn: taskDef.taskRoleArn,
        containerDefinitions: newContainerDefs,
        volumes: taskDef.volumes,
      });

      const newTaskDef = await this.ecsClient.send(registerTaskCmd);
      const newTaskDefArn = newTaskDef.taskDefinition?.taskDefinitionArn;

      if (!newTaskDefArn) {
        throw new Error("Failed to register new task definition");
      }

      // 4. Update Service to use new Task Definition
      await this.ecsClient.send(
        new UpdateServiceCommand({
          cluster: this.cluster,
          service: serviceName,
          taskDefinition: newTaskDefArn,
          forceNewDeployment: true, // Ensure it redeploys
        })
      );

      console.log(`Updated environment for ${agentName}`);
    } catch (error) {
      console.error(`Failed to update environment for ${agentName}:`, error);
      throw error;
    }
  }
}

