# --- ECR for Gateway ---
resource "aws_ecr_repository" "gateway" {
  name                 = "${var.project_name}-${var.environment}-gateway"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = {
    Environment = var.environment
  }
}

# --- Gateway Task Definition ---
# Using a lightweight public placeholder image initially
# This allows TF to succeed, and then CD pipeline updates the service with the real image later.
resource "aws_ecs_task_definition" "gateway" {
  family                   = "${var.project_name}-${var.environment}-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.gateway_task_role.arn

  tags = {
    Environment = var.environment
  }

  container_definitions = jsonencode([
    {
      name      = "gateway"
      image     = "public.ecr.aws/nginx/nginx:latest"
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80 # CHANGED: Host port must match container port in awsvpc mode
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "GATEWAY_SECRET"
          value = var.gateway_secret
        },
        {
          name  = "CLOUD_MAP_NAMESPACE"
          value = aws_service_discovery_private_dns_namespace.main.name
        },
        {
          name  = "ECS_CLUSTER"
          value = aws_ecs_cluster.main.name
        },
        {
          name  = "PROJECT_NAME"
          value = var.project_name
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}-gateway"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])

  # Ignore changes to container_definitions so subsequent TF applies don't revert our deployed image
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# --- Gateway Service ---
resource "aws_ecs_service" "gateway" {
  name            = "${var.project_name}-${var.environment}-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  tags = {
    Environment = var.environment
  }

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 80 # Matches the placeholder image port
  }

  depends_on = [aws_lb_listener.https]
  
  # Ignore task_definition changes since CD pipeline will update it
  lifecycle {
    ignore_changes = [task_definition]
  }
}
