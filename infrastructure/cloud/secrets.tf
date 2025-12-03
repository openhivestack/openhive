# --- Docker Hub Credentials ---

resource "aws_secretsmanager_secret" "dockerhub_username" {
  name        = "${var.project_name}/${var.environment}/dockerhub/username"
  description = "Docker Hub Username for CodeBuild"
  
  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "dockerhub_username" {
  secret_id     = aws_secretsmanager_secret.dockerhub_username.id
  secret_string = var.dockerhub_username
}

resource "aws_secretsmanager_secret" "dockerhub_token" {
  name        = "${var.project_name}/${var.environment}/dockerhub/token"
  description = "Docker Hub Access Token for CodeBuild"

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "dockerhub_token" {
  secret_id     = aws_secretsmanager_secret.dockerhub_token.id
  secret_string = var.dockerhub_token
}

