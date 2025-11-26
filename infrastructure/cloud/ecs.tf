# --- ECS Cluster ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  tags = {
    Environment = var.environment
  }
}

# --- CloudWatch Log Group ---
resource "aws_cloudwatch_log_group" "ecs_agents" {
  name              = "/ecs/openhive-agents"
  retention_in_days = 30

  tags = {
    Environment = var.environment
  }
}
