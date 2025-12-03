# --- CodeBuild Project ---
resource "aws_codebuild_project" "agent_builder" {
  name          = "${var.project_name}-${var.environment}-agent-builder"
  description   = "Builds agent Docker images from source (${var.environment})"
  build_timeout = "10"
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  tags = {
    Environment = var.environment
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true # Needed for building Docker images

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
      name  = "ECR_REPO_URL"
      value = aws_ecr_repository.agents.repository_url
    }
    environment_variable {
      name  = "BASE_IMAGE_REPO_URL"
      value = aws_ecr_repository.base_images.repository_url
    }
    environment_variable {
      name  = "ECS_CLUSTER_NAME"
      value = aws_ecs_cluster.main.name
    }
    environment_variable {
      name  = "SOURCE_BUCKET"
      value = "PLACEHOLDER" # Overridden at runtime
    }
    environment_variable {
      name  = "SOURCE_KEY"
      value = "PLACEHOLDER" # Overridden at runtime
    }
    environment_variable {
      name  = "AGENT_NAME"
      value = "PLACEHOLDER" # Overridden at runtime
    }
    environment_variable {
      name  = "AGENT_VERSION"
      value = "latest" # Overridden at runtime
    }
    environment_variable {
      name  = "BUILD_ASSETS_BUCKET"
      value = aws_s3_bucket.agent_sources.bucket
    }
    environment_variable {
      name  = "DOCKERHUB_USERNAME"
      value = aws_secretsmanager_secret.dockerhub_username.arn
      type  = "SECRETS_MANAGER"
    }
    environment_variable {
      name  = "DOCKERHUB_TOKEN"
      value = aws_secretsmanager_secret.dockerhub_token.arn
      type  = "SECRETS_MANAGER"
    }
  }

  source {
    type      = "NO_SOURCE" # We provide source info via start-build override or manually downloading in buildspec
    buildspec = <<EOF
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - echo Logging in to Docker Hub...
      - echo $DOCKERHUB_TOKEN | docker login --username $DOCKERHUB_USERNAME --password-stdin
      - echo Downloading source...
      - aws s3 cp s3://$SOURCE_BUCKET/$SOURCE_KEY source.tar.gz
      - mkdir agent && tar -xzf source.tar.gz -C agent
      - cd agent
      - echo Downloading build script...
      - aws s3 cp s3://$BUILD_ASSETS_BUCKET/scripts/generate_dockerfile.sh generate_dockerfile.sh
      - chmod +x generate_dockerfile.sh
      - ./generate_dockerfile.sh
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build --build-arg BASE_IMAGE_REPO_URL=$BASE_IMAGE_REPO_URL -t $ECR_REPO_URL:$AGENT_NAME-$AGENT_VERSION .
  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker image...
      - docker push $ECR_REPO_URL:$AGENT_NAME-$AGENT_VERSION
      - echo Downloading service update script...
      - aws s3 cp s3://$BUILD_ASSETS_BUCKET/scripts/update_service.sh update_service.sh
      - chmod +x update_service.sh
      - SERVICE_NAME="service-$AGENT_NAME" ./update_service.sh
EOF
  }
}

# --- Upload Build Assets ---

resource "aws_s3_object" "dockerfile_node" {
  bucket = aws_s3_bucket.agent_sources.id
  key    = "templates/Dockerfile.node"
  source = "${path.module}/templates/Dockerfile.node"
  etag   = filemd5("${path.module}/templates/Dockerfile.node")
}

resource "aws_s3_object" "dockerfile_python" {
  bucket = aws_s3_bucket.agent_sources.id
  key    = "templates/Dockerfile.python"
  source = "${path.module}/templates/Dockerfile.python"
  etag   = filemd5("${path.module}/templates/Dockerfile.python")
}

resource "aws_s3_object" "generate_dockerfile_script" {
  bucket = aws_s3_bucket.agent_sources.id
  key    = "scripts/generate_dockerfile.sh"
  source = "${path.module}/scripts/generate_dockerfile.sh"
  etag   = filemd5("${path.module}/scripts/generate_dockerfile.sh")
}

resource "aws_s3_object" "update_service_script" {
  bucket = aws_s3_bucket.agent_sources.id
  key    = "scripts/update_service.sh"
  source = "${path.module}/scripts/update_service.sh"
  etag   = filemd5("${path.module}/scripts/update_service.sh")
}
