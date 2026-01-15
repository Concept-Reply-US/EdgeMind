---
scope: Full CI/CD pipeline - source to production
kind: system
content_hash: 7fe79917b791b5df5a029ac005f16998
---

# Hypothesis: AWS CodePipeline + CodeBuild

AWS-native CI/CD using CodePipeline for orchestration and CodeBuild for builds.

Pipeline stages:
1. Source: GitHub connection via CodeStar
2. Build: CodeBuild builds Docker image, pushes to ECR
3. Deploy-Frontend: CodeBuild runs `aws s3 sync` + CloudFront invalidation
4. Deploy-Backend: CodeDeploy or direct ECS deploy action

Benefits:
- Native AWS integration (IAM roles, no credential management)
- Can be defined in CDK (infrastructure as code)
- Deep integration with ECS blue/green deployments
- All logs in CloudWatch

Drawbacks:
- More complex setup
- CodePipeline pricing (~$1/pipeline/month + CodeBuild minutes)
- Less flexible than GitHub Actions for custom workflows

## Rationale
{"anomaly": "Need automated deployment", "approach": "AWS-native tooling for tight integration", "alternatives_rejected": ["Jenkins - overkill, self-managed"]}