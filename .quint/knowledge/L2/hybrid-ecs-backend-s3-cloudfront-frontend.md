---
kind: system
scope: Separated frontend/backend deployment - frontend static, backend containerized
content_hash: 9199227a695133fc8b4e5e28c378444c
---

# Hypothesis: Hybrid ECS Backend + S3/CloudFront Frontend

Split architecture: Static frontend (HTML/CSS/JS) on S3+CloudFront, backend API/WebSocket on ECS Fargate.

Method:
1. Frontend: Upload index.html, styles.css, app.js to S3 bucket
2. CloudFront distribution serves frontend with HTTPS
3. Backend: ECS Fargate runs server.js behind ALB/NLB
4. Frontend WebSocket connects to backend via dedicated subdomain (ws.edgemind.example.com)

Deployment workflow:
- Frontend: `aws s3 sync ./frontend s3://bucket/ --delete` (instant)
- Backend: Push image to ECR, update task definition, ECS rolls out

Benefits:
- Frontend deploys in seconds (S3 sync)
- Backend deploys independently
- CloudFront caching for static assets
- Clear separation of concerns

## Rationale
{"anomaly": "Current deployment couples frontend and backend unnecessarily", "approach": "Separate static assets from dynamic backend for independent deploys", "alternatives_rejected": ["Amplify - overkill for static files"]}