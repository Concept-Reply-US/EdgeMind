---
scope: Minimal change to existing infrastructure - automation layer only
kind: system
content_hash: fb172b920c41ab1feeb1d08cf32e69ee
---

# Hypothesis: Simplified EC2 with CI/CD Pipeline

Keep current EC2 instance but add GitHub Actions or CodePipeline for automated deployment. Conservative approach - minimal infrastructure change.

Method:
1. GitHub Actions workflow triggers on push to main
2. Workflow builds Docker image, pushes to ECR
3. SSH into EC2 (via SSM or SSH key in secrets)
4. Pull new image, stop/start container
5. Health check verification

Or with CodeDeploy:
1. appspec.yml defines deployment hooks
2. CodeDeploy agent on EC2 handles blue/green or in-place
3. Automatic rollback on failure

Keeps existing infrastructure, just automates the manual steps currently in CLAUDE.md.

## Rationale
{"anomaly": "Manual scp/docker cp commands are error-prone", "approach": "Automate existing process without infrastructure overhaul", "alternatives_rejected": ["Jenkins - unnecessary complexity for single project"]}