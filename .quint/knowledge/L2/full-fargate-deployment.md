---
scope: Full application stack - backend, frontend, stateful services
kind: system
content_hash: 40e88c31500cb532ae7bc5b34570f24c
---

# Hypothesis: Full Fargate Deployment

Deploy the entire backend as ECS Fargate tasks behind the existing ALB. Container images pushed to ECR, task definitions specify the image version. Rolling deployments handled automatically by ECS service. InfluxDB and ChromaDB as separate Fargate services or managed alternatives.

Method:
1. Build Docker image with all dependencies baked in (lib/, node_modules, frontend files)
2. Push to ECR with version tag
3. Update ECS task definition to new image
4. ECS performs rolling deployment automatically
5. ALB health checks ensure zero-downtime

Key changes:
- Dockerfile must include ALL files (no bind mounts)
- Frontend served from same container or separate nginx container
- WebSocket connections handled via ALB sticky sessions or NLB

## Rationale
{"anomaly": "EC2 manual deployment is error-prone", "approach": "Fully managed containers with automatic deployment", "alternatives_rejected": ["Lambda - not suitable for WebSocket/MQTT long-running connections"]}