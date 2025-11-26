# --- S3 Bucket ---
resource "aws_s3_bucket" "agent_sources" {
  bucket        = "${var.project_name}-${var.environment}-agent-sources"
  force_destroy = true # Allows deleting bucket even if it contains objects

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-sources"
    Environment = var.environment
  }
}

# --- Bucket Versioning ---
resource "aws_s3_bucket_versioning" "agent_sources" {
  bucket = aws_s3_bucket.agent_sources.id
  versioning_configuration {
    status = "Enabled"
  }
}

# --- Lifecycle Rule (Cleanup) ---
# Only cleaning up noncurrent versions (overwritten files)
# Active versions are kept forever
resource "aws_s3_bucket_lifecycle_configuration" "agent_sources" {
  bucket = aws_s3_bucket.agent_sources.id

  rule {
    id     = "cleanup-overwritten-versions"
    status = "Enabled"

    filter {
      prefix = ""
    }

    # Only expire versions that have been overwritten (noncurrent)
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
