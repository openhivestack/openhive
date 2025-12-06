# --- Route53 Hosted Zone ---
resource "aws_route53_zone" "gateway" {
  name = "${var.gateway_subdomain}-${var.environment}.${var.domain_name}"

  tags = {
    Environment = var.environment
  }
}

# --- Certificate Validation Record ---
resource "aws_route53_record" "gateway_validation" {
  for_each = {
    for dvo in aws_acm_certificate.gateway.domain_validation_options : dvo.domain_name => dvo
  }

  allow_overwrite = true
  name            = each.value.resource_record_name
  records         = [each.value.resource_record_value]
  ttl             = 60
  type            = each.value.resource_record_type
  zone_id         = aws_route53_zone.gateway.zone_id
}

# --- ALB Alias Record ---
# This points https://gateway-dev.openhive.cloud to the ALB
resource "aws_route53_record" "gateway_alb" {
  zone_id = aws_route53_zone.gateway.zone_id
  name    = "${var.gateway_subdomain}-${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

