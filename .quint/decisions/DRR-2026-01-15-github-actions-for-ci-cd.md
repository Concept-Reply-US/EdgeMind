---
type: DRR
winner_id: github-actions
created: 2026-01-15T15:25:53-05:00
content_hash: dc3e604fbc7bff15d8d2687fd56be91f
---

# GitHub Actions for CI/CD

## Context
Need automated deployment pipeline for new hybrid ECS + S3/CloudFront architecture. Must handle frontend deploys to S3, backend image builds to ECR, ECS service updates, and CloudFront cache invalidation.

## Decision
**Selected Option:** github-actions

Use GitHub Actions for CI/CD pipeline with OIDC federation for AWS credentials. Two workflows: (1) Frontend deploy on changes to index.html, styles.css, app.js, (2) Backend deploy on changes to server.js, lib/, Dockerfile.

## Rationale
1. Higher R_eff (0.88) vs CodePipeline (0.75). 2. Simpler setup - single YAML file vs 5+ AWS resources. 3. Free tier (2000 min/month) sufficient for this project. 4. OIDC federation eliminates credential management. 5. Faster iteration - edit YAML, push, done. 6. Industry standard for GitHub-hosted projects.

### Characteristic Space (C.16)
Evidence: External (CL2). Confidence: High. Industry standard approach.

## Consequences
IMPLEMENTATION: Create .github/workflows/ with deploy workflows. Configure OIDC identity provider in AWS IAM. Create IAM role for GitHub Actions. TRADE-OFFS: Not defined in CDK (separate from infrastructure). Rolling deploys only (no native blue/green). Must maintain workflow YAML separately from infrastructure.
