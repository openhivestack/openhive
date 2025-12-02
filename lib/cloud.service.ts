import { CloudProvider } from "./cloud-provider.interface";
import { AwsCloudProvider } from "./aws-cloud.provider";
import { K8sCloudProvider } from "./k8s-cloud.provider";

export class CloudService {
  private static instance: CloudProvider;

  static getInstance(): CloudProvider {
    if (!this.instance) {
      const provider = process.env.CLOUD_PROVIDER || "aws";
      if (provider === "k8s") {
        this.instance = new K8sCloudProvider();
      } else {
        this.instance = new AwsCloudProvider();
      }
    }
    return this.instance;
  }
}

export const cloudService = CloudService.getInstance();

