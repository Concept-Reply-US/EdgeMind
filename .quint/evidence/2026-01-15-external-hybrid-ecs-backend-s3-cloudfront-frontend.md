---
target: hybrid-ecs-backend-s3-cloudfront-frontend
verdict: pass
assurance_level: L2
carrier_ref: test-runner
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-external-hybrid-ecs-backend-s3-cloudfront-frontend.md
type: external
content_hash: 18d576c8fc10d3b0debab45e1668853c
---

VALIDATED via AWS documentation - this is the recommended pattern:

**CloudFront Multi-Origin:** CloudFront supports multiple origins with path-based routing. Can route "/" to S3, "/ws/" to WebSocket backend. AWS explicitly documents this as the recommended architecture.

**WebSocket Headers Required:** Must configure origin request policy with: Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol, Sec-WebSocket-Accept, Sec-WebSocket-Extensions.

**S3 Limitation Confirmed:** S3 cannot handle WebSocket directly - must use separate backend origin (ECS/Fargate or API Gateway WebSocket API).

**Deployment Simplicity:** Frontend deploy = `aws s3 sync`. Backend deploy = ECR push + ECS service update. Both operations are single commands.

**AWS Prescriptive Guidance:** This exact pattern is documented in AWS Prescriptive Guidance for React SPAs.

Sources: AWS CloudFront WebSocket docs, AWS Prescriptive Guidance, AWS re:Post WSS+CloudFront thread