---
scope: Full CI/CD pipeline - source to production
kind: system
content_hash: 64b74948afad3ef15ca1476e539163fa
---

# Hypothesis: GitHub Actions

GitHub-native CI/CD using Actions workflows.

Workflow structure:
1. On push to main: trigger pipeline
2. Build job: Docker build, push to ECR (using aws-actions/amazon-ecr-login)
3. Deploy-Frontend job: aws s3 sync, CloudFront invalidation
4. Deploy-Backend job: aws ecs update-service --force-new-deployment

Benefits:
- Already using GitHub for source control
- Free for public repos, 2000 mins/month for private
- Simpler YAML syntax, huge marketplace of actions
- Faster iteration (edit workflow, push, done)
- Better visibility in GitHub UI

Drawbacks:
- Need to manage AWS credentials (OIDC or secrets)
- Not defined in CDK (separate from infrastructure)
- Less native ECS integration (no built-in blue/green)

## Rationale
{"anomaly": "Need automated deployment", "approach": "GitHub-native for simplicity and familiarity", "alternatives_rejected": ["CircleCI - another external service to manage"]}