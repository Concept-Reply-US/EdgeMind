---
scope: Backend deployment only - maintains EC2 with improved automation
kind: system
content_hash: 10d8dc4eb3890a401be839045e374c30
---

# Hypothesis: ECS EC2 with Immutable AMI

Keep ECS but use EC2 launch type with pre-baked AMIs instead of manual docker cp. Golden AMI contains Docker + all dependencies, ECS agent handles container orchestration.

Method:
1. Create base AMI with Docker, ECS agent, common tools
2. Container image in ECR contains full application
3. ECS service manages container lifecycle on EC2 instances
4. Auto Scaling Group handles instance replacement
5. Deployments: push new image, force new deployment

Keeps EC2 control (for debugging, SSH access) but removes manual file management. More cost-effective than Fargate for always-on workloads.

## Rationale
{"anomaly": "Manual EC2 management is painful", "approach": "Automate EC2 with ECS orchestration while keeping cost benefits", "alternatives_rejected": ["Kubernetes - overkill for single-service deployment"]}