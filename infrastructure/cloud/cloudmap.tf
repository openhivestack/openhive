# --- Cloud Map (Service Discovery) ---
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}-${var.environment}.local"
  description = "Service discovery for OpenHive agents (${var.environment})"
  vpc         = aws_vpc.main.id

  tags = {
    Environment = var.environment
  }
}
