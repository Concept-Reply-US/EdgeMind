---
scope: EdgeMind deployment automation
kind: episteme
content_hash: 019199b8b32c80408ccd70d2b7253952
---

# Hypothesis: CI/CD Strategy Decision

Parent decision holon for CI/CD pipeline approach. Must handle: (1) Frontend deploys to S3, (2) Backend image builds to ECR, (3) ECS service updates, (4) CloudFront cache invalidation.

## Rationale
{"anomaly": "Need automated deployment pipeline for new hybrid architecture", "approach": "Evaluate AWS-native vs GitHub-native CI/CD", "alternatives_rejected": []}