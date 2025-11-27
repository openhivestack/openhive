.PHONY: up down restart logs build push build-push load activate

# --- Configuration ---
NAMESPACE := openhive
RELEASE_NAME := openhive
HELM_DIR := ./infrastructure/k8s
IMAGE_NAME := openhivestack/openhive
TAG ?= latest

# --- Kubernetes / Minikube ---

# Start the entire stack on Minikube (assumes minikube is running)
up:
	@echo "Installing dependencies..."
	helm dependency update $(HELM_DIR)
	@echo "Deploying OpenHive to Kubernetes..."
	helm upgrade --install $(RELEASE_NAME) $(HELM_DIR) \
		--create-namespace \
		--namespace $(NAMESPACE) \
		--set image.tag=$(TAG)
	@echo "Waiting for pods to be ready..."
	kubectl wait --namespace $(NAMESPACE) \
		--for=condition=ready pod \
		--selector=app.kubernetes.io/name=$(RELEASE_NAME) \
		--timeout=300s
	@echo "🚀 OpenHive is ready! Access it via port-forwarding:"
	@echo "make activate"

# Activate via port-forwarding
# Runs port-forwarding for both the main app (3000) and MinIO (9000)
activate:
	@echo "Activating OpenHive..."
	@echo "Forwarding OpenHive (3000) and MinIO (9000)..."
	@trap 'kill %1' SIGINT; \
	kubectl port-forward svc/minio 9000:9000 -n $(NAMESPACE) > /dev/null 2>&1 & \
	kubectl port-forward svc/openhive 3000:3000 -n $(NAMESPACE)

# Tear down the stack
down:
	@echo "Uninstalling OpenHive..."
	helm uninstall $(RELEASE_NAME) --namespace $(NAMESPACE) || true
	@echo "Deleting namespace..."
	kubectl delete namespace $(NAMESPACE) --ignore-not-found

# Restart the deployment (useful after pushing a new image)
restart:
	kubectl rollout restart deployment/$(RELEASE_NAME) -n $(NAMESPACE)

# Tail logs
logs:
	kubectl logs -l app.kubernetes.io/name=$(RELEASE_NAME) -n $(NAMESPACE) -f

# --- Docker ---

# Build the Docker image locally
build:
	@echo "Building Docker image $(IMAGE_NAME):$(TAG)..."
	docker build -t $(IMAGE_NAME):$(TAG) .

# Push the Docker image to Docker Hub (requires docker login)
push:
	@echo "Pushing Docker image $(IMAGE_NAME):$(TAG)..."
	docker push $(IMAGE_NAME):$(TAG)

# Build and Push in one go
build-push: build push

# Build and Load into Minikube (avoids pushing to registry for local dev)
load: build
	@echo "Loading image into Minikube..."
	minikube image load $(IMAGE_NAME):$(TAG)
	@echo "Image loaded. You can now run 'make up'"

reset: down load up activate

status:
	@echo "Getting status of OpenHive..."
	kubectl get pods -n $(NAMESPACE)
