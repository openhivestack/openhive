# --- ECR Repository ---
resource "aws_ecr_repository" "agents" {
  name                 = "${var.project_name}-${var.environment}-agents"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = {
    Environment = var.environment
  }
}

# --- Base Image Repository ---
resource "aws_ecr_repository" "base_images" {
  name                 = "${var.project_name}-${var.environment}-base-images"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = {
    Environment = var.environment
  }
}
