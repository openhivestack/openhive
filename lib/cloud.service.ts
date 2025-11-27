import { AwsCloudProvider } from "./aws-cloud.provider";
import { K8sCloudProvider } from "./k8s-cloud.provider";
import { CloudProvider, ServiceStatus } from "./cloud-provider.interface";

// Factory to create the appropriate Cloud Provider
function createCloudProvider(): CloudProvider {
  const providerType = process.env.CLOUD_PROVIDER || "aws";

  if (providerType === "aws") {
    return new AwsCloudProvider();
  }

  if (providerType === "k8s") {
    return new K8sCloudProvider();
  }

  throw new Error(`Unsupported Cloud Provider: ${providerType}`);
}

// Singleton instance
export const cloudService = createCloudProvider();
