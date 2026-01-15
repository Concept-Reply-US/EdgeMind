---
type: DRR
winner_id: hybrid-ecs-backend-s3-cloudfront-frontend
created: 2026-01-15T15:13:22-05:00
content_hash: 1614684f9aa08521959c60bdb91a7981
---

# Hybrid ECS Backend + S3/CloudFront Frontend Deployment

## Context
EC2-based deployment was causing friction: manual scp + docker cp commands, container recreation losing files (lib/, styles.css, app.js), complex recovery steps documented in CLAUDE.md. Goal was frictionless deployment while maintaining WebSocket/MQTT real-time architecture.

## Decision
**Selected Option:** hybrid-ecs-backend-s3-cloudfront-frontend

We will deploy EdgeMind using a hybrid architecture: static frontend (index.html, styles.css, app.js) on S3 + CloudFront, backend (server.js, lib/) on ECS Fargate behind ALB. Infrastructure will be defined using AWS CDK with Python (latest version).

## Rationale
1. Highest R_eff (0.90) among candidates. 2. AWS Prescriptive Guidance explicitly endorses this pattern for SPAs with real-time backends. 3. Frontend deploys become trivial (aws s3 sync). 4. Backend deploys are immutable container pushes - no more docker cp. 5. Clear separation enables independent deploy cycles. 6. Full Fargate rejected due to 2-3x cost increase without proportional benefit. 7. ECS EC2 with AMI rejected due to operational overhead (AMI management) and potential anchoring bias.

### Characteristic Space (C.16)
Evidence: External research (CL2), AWS official documentation. Confidence: High. Validity: Revisit if cost exceeds $100/mo or if WebSocket latency issues arise.

## Consequences
IMPLEMENTATION REQUIRED: 1. Create CDK stack with S3 bucket, CloudFront distribution, ECS Fargate service, ALB. 2. Update Dockerfile to include ALL files (no bind mounts). 3. Configure CloudFront behaviors: / -> S3, /ws/* -> Backend. 4. Configure CORS on backend for cross-origin WebSocket. 5. Set up CI/CD pipeline for both frontend (S3 sync) and backend (ECR push). TRADE-OFFS: Two deployment pipelines to maintain (but each is simple). Need dedicated backend subdomain. Monthly cost similar to current (~$30-50 for Fargate portion).
