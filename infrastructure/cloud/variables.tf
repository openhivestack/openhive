variable "aws_region" {
  default = "us-east-1"
}

variable "project_name" {
  default = "openhive"
}

variable "environment" {
  description = "Deployment environment (dev, itg, pro)"
  default     = "dev"
}

variable "domain_name" {
  description = "The root domain name for the gateway (e.g. openhive.sh)"
  default     = "openhive.sh"
}

variable "gateway_subdomain" {
  description = "The subdomain for the gateway (e.g. gateway)"
  default     = "gateway"
}

variable "gateway_secret" {
  description = "Secret key for authenticating OpenHive requests to the gateway"
  type        = string
  sensitive   = true
  default     = "changeme_in_production" # Should be passed via -var or tfvars
}
