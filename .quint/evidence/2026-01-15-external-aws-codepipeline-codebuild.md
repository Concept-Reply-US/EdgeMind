---
verdict: pass
assurance_level: L2
carrier_ref: test-runner
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-external-aws-codepipeline-codebuild.md
type: external
target: aws-codepipeline-codebuild
content_hash: 77465406253fcf72b38782e1da1eed9b
---

AWS CodePipeline validated:
- Native ECS deployment action available
- S3 deploy action built-in
- Can define in CDK via aws_codepipeline module
- Cost: ~$1/pipeline/month + $0.005/build-minute
- Blue/green ECS deployments supported via CodeDeploy

Complexity: Higher setup cost, better for larger teams with multiple environments.