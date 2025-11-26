#!/bin/sh
set -e

# Expects:
# - AWS_DEFAULT_REGION
# - ECS_CLUSTER_NAME
# - SERVICE_NAME (service-$AGENT_NAME)
# - ECR_REPO_URL
# - AGENT_NAME
# - AGENT_VERSION

echo "Updating ECS Service: $SERVICE_NAME"

if aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $SERVICE_NAME | grep -q "ACTIVE"; then
   echo "Service $SERVICE_NAME exists. Updating to force new deployment..."
   
   # Fetch current Task Def
   TASK_DEF_ARN=$(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $SERVICE_NAME --query "services[0].taskDefinition" --output text)
   TASK_DEF_JSON=$(aws ecs describe-task-definition --task-definition $TASK_DEF_ARN --query "taskDefinition")
   
   # Create New Task Def JSON with updated Image
   NEW_IMAGE="$ECR_REPO_URL:$AGENT_NAME-$AGENT_VERSION"
   echo "Updating task definition to use image: $NEW_IMAGE"
   
   # Use jq to update the image in the task definition
   # Note: We are stripping out read-only fields
   NEW_TASK_DEF_JSON=$(echo $TASK_DEF_JSON | jq --arg IMAGE "$NEW_IMAGE" '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')
   
   # Register New Revision
   NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_TASK_DEF_JSON" --query "taskDefinition.taskDefinitionArn" --output text)
   echo "Registered new task definition: $NEW_TASK_DEF_ARN"
   
   # Update Service
   aws ecs update-service --cluster $ECS_CLUSTER_NAME --service $SERVICE_NAME --task-definition $NEW_TASK_DEF_ARN --force-new-deployment
   echo "Deployment triggered successfully."
else
   echo "Service $SERVICE_NAME does not exist yet. Skipping deployment trigger. Initial deployment must be done via API."
fi

