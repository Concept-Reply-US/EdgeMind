---
id: 2026-01-15-external-github-actions.md
type: external
target: github-actions
verdict: pass
assurance_level: L2
carrier_ref: test-runner
valid_until: 2026-04-15
date: 2026-01-15
content_hash: 54c85be4c993596baa7ef840ddac9279
---

GitHub Actions validated:
- aws-actions/amazon-ecr-login: official AWS action for ECR
- aws-actions/amazon-ecs-deploy-task-definition: official ECS deploy
- OIDC federation: configure-aws-credentials action supports OIDC (no long-lived keys)
- Free tier: 2000 minutes/month for private repos
- S3 sync: simple aws s3 sync command in workflow

Industry standard. Simpler setup. Faster iteration cycle.