# --- ACM Certificate ---
resource "aws_acm_certificate" "gateway" {
  # e.g. gateway-dev.openhive.cloud
  domain_name       = "${var.gateway_subdomain}-${var.environment}.${var.domain_name}"
  validation_method = "DNS"

  tags = {
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- Certificate Validation Waiter ---
# Terraform will use the Route53 record we created in dns.tf to validate this.
# It works automatically once the Zone Delegation (NS records) is done in Namecheap.
resource "aws_acm_certificate_validation" "gateway" {
  certificate_arn         = aws_acm_certificate.gateway.arn
  validation_record_fqdns = [for record in aws_route53_record.gateway_validation : record.fqdn]
}
