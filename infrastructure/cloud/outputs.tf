output "agent_sources_bucket" {
  value = aws_s3_bucket.agent_sources.id
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "gateway_repo_url" {
  value = aws_ecr_repository.gateway.repository_url
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnets" {
  value = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

output "private_subnets" {
  value = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.agents.repository_url
}

output "codebuild_project_name" {
  value = aws_codebuild_project.agent_builder.name
}

output "execution_role_arn" {
  value = aws_iam_role.ecs_task_execution_role.arn
}

output "security_group_id" {
  value = aws_security_group.ecs_sg.id
}

output "cloud_map_namespace_id" {
  value = aws_service_discovery_private_dns_namespace.main.id
}

# Important: Add these Name Servers to your Namecheap configuration for the subdomain!
output "route53_name_servers" {
  description = "The name servers for the Route53 Hosted Zone. Add these as NS records in Namecheap."
  value       = aws_route53_zone.gateway.name_servers
}

output "gateway_url" {
  value = "https://${aws_route53_record.gateway_alb.name}"
}
