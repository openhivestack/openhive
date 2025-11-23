import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type MetricType = "DOWNLOAD" | "TASK_EXECUTION";
export type MetricStatus = "SUCCESS" | "FAILURE";

export interface MetricData {
  agentVersionId: string;
  type: MetricType;
  status: MetricStatus;
  duration?: number;
  userId?: string;
  organizationId?: string;
  userAgent?: string;
  context?: Record<string, any>;
}

export async function recordMetric(data: MetricData) {
  try {
    await prisma.agentVersionMetric.create({
      data: {
        agentVersionId: data.agentVersionId,
        type: data.type,
        status: data.status,
        duration: data.duration,
        userId: data.userId,
        organizationId: data.organizationId,
        userAgent: data.userAgent,
        context: data.context ?? PrismaClient.JsonNull,
      },
    });
  } catch (error) {
    console.error("Failed to record metric:", error);
    // Don't throw, as metrics shouldn't break the app
  }
}

export async function incrementDownloadCount(agentVersionId: string) {
  try {
    await prisma.agentVersion.update({
      where: { id: agentVersionId },
      data: { downloadCount: { increment: 1 } },
    });
  } catch (error) {
    console.error("Failed to increment download count:", error);
  }
}
