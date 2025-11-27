# OpenHive Private Cloud Deployment

This directory contains the Helm chart and configuration for deploying the full OpenHive stack (Platform, Database, Object Storage, and Registry) into a Kubernetes cluster. This setup transforms OpenHive into a self-hosted, private registry and agent execution environment, capable of running completely offline or within an air-gapped enterprise VPC.

## Architecture

When deployed in `k8s` mode (`CLOUD_PROVIDER=k8s`), OpenHive orchestrates agents natively using Kubernetes resources:

- **Platform**: The core OpenHive Next.js application running as a Deployment.
- **Agent Storage**: Source code is stored in the bundled **MinIO** instance (S3 compatible).
- **Image Building**: Source code is built into Docker images using **Kaniko** jobs inside the cluster (daemonless build).
- **Registry**: Built images are pushed to the bundled private **Docker Registry** (accessible via NodePort 30500 locally or ClusterIP in prod).
- **Execution**: Agents are deployed as standard **Kubernetes Deployments** and **Services**, managed dynamically by the OpenHive Platform.

## Prerequisites

- [Kubernetes](https://kubernetes.io/) 1.24+
- [Helm](https://helm.sh/) 3.0+
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) (for local testing)
- [Make](https://www.gnu.org/software/make/) (for convenience scripts)

---

## 🚀 Local Development (Minikube)

We provide a `makefile` in the `openhive` root directory to automate the entire lifecycle of the local cluster.

### 1. Start Minikube

Start a local cluster. We recommend at least 4 CPUs and 8GB RAM for building agents.

```bash
minikube start --cpus 4 --memory 8192
```

### 2. Deploy the Stack

Run the following command from the `openhive` directory. This will:

1. Build the OpenHive platform Docker image locally.
2. Load the image into Minikube.
3. Install/Upgrade the Helm chart with local development settings.
4. Wait for all pods (Postgres, MinIO, Registry) to be ready.

```bash
make reset
```

### 3. Access the Platform

Once deployed, you need to port-forward the services to your host machine.

```bash
make activate
```

- **OpenHive UI**: [http://localhost:3000](http://localhost:3000)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)

### 4. CLI Configuration

Configure your local OpenHive CLI to talk to this local instance.

```bash
# Login to your local instance
hive login --registry http://localhost:3000

# Publish an agent
hive publish -d ./my-agent-folder

# Deploy the agent
hive agent deploy my-agent
```

### Useful Commands

- `make logs`: Tail logs of the main OpenHive platform pod.
- `make reset`: Full wipe and redeploy (useful after code changes).
- `make down`: Uninstall the Helm chart and clean up the namespace.

---

## 🏭 Production Deployment

For production environments (AWS EKS, Google GKE, Azure AKS, or On-Premise), follow these steps.

### 1. Infrastructure Requirements

- **Storage Class**: Ensure a default `StorageClass` is defined for Persistent Volume Claims (PVCs) for Postgres and MinIO.
- **Ingress Controller**: An Ingress controller (e.g., NGINX, AWS ALB) is required to expose the platform.
- **Cert Manager**: (Optional) For automatic SSL/TLS certificates.

### 2. Configure `values.yaml`

Do **not** edit the default `values.yaml` directly. Create a production overrides file, e.g., `prod-values.yaml`.

**Critical Production Settings:**

```yaml
# prod-values.yaml

global:
  domain: "openhive.your-company.com"

# Enable Ingress
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: openhive.your-company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: openhive-tls
      hosts:
        - openhive.your-company.com

# Secure Passwords & Secrets
postgresql:
  auth:
    password: "YOUR_STRONG_DB_PASSWORD"

minio:
  auth:
    rootPassword: "YOUR_STRONG_MINIO_PASSWORD"

secrets:
  betterAuthSecret: "GENERATED_RANDOM_STRING_MIN_32_CHARS"
  gatewaySecret: "GENERATED_SECURE_TOKEN_FOR_AGENT_PROXY"
  githubClientId: "YOUR_GITHUB_ID" # If using GitHub Auth
  githubClientSecret: "YOUR_GITHUB_SECRET"

# Registry Configuration
# In production, we typically use ClusterIP instead of NodePort
registry:
  service:
    type: ClusterIP
```

### 3. Install via Helm

```bash
helm upgrade --install openhive ./infrastructure/k8s \
  --namespace openhive \
  --create-namespace \
  -f prod-values.yaml
```

### 4. Post-Install Verification

Check that all pods are running and PVCs are bound.

```bash
kubectl get pods,pvc -n openhive
```

---

## ⚙️ Configuration Reference

| Parameter               | Description                                                                | Default        |
| ----------------------- | -------------------------------------------------------------------------- | -------------- |
| `cloudProvider`         | Backend mode (`k8s` for this chart).                                       | `k8s`          |
| `postgresql.enabled`    | Deploy bundled Postgres (set `false` if using external RDS/CloudSQL).      | `true`         |
| `minio.enabled`         | Deploy bundled MinIO (set `false` if using AWS S3).                        | `true`         |
| `registry.enabled`      | Deploy bundled Docker Registry.                                            | `true`         |
| `registry.service.type` | Service type for registry (`NodePort` for Minikube, `ClusterIP` for Prod). | `NodePort`     |
| `secrets.gatewaySecret` | **Critical**: Shared secret for proxying requests to agents.               | `change-me...` |

## 🔧 Troubleshooting

**Build Job Failing (`ContainerCreating` or `MountVolume.SetUp failed`):**
Ensure the `regcred` secret exists. The chart creates a default one, but if you are using an external registry, you must create it manually:

```bash
kubectl create secret docker-registry regcred --docker-server=... --docker-username=... --docker-password=... -n openhive
```

**Agent stuck in `ImagePullBackOff`:**

1. Check if the registry is reachable from the node. In Minikube, we use `localhost:30500`. In production, this should be the ClusterIP DNS (e.g., `openhive-registry.openhive.svc.cluster.local:5000`) and you may need to configure your nodes to trust the insecure registry or set up proper TLS.
2. Check `kubectl describe pod agent-name...` for specific error messages.

**CLI Exec failing with 500:**
Ensure `GATEWAY_SECRET` is set correctly in `values.yaml` and matches the one expected by the platform.
