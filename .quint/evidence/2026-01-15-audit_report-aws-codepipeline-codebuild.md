---
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-audit_report-aws-codepipeline-codebuild.md
type: audit_report
target: aws-codepipeline-codebuild
verdict: pass
content_hash: cf8cd8c697ed535f337d85dd5f1caac7
---

**Evidence Quality:** External (CL2) - AWS documentation

**Risk Factors:**
1. COMPLEXITY RISK (High): More moving parts - CodePipeline, CodeBuild, CodeStar connection, IAM roles
2. COST RISK (Low): ~$5-10/month for this use case
3. OVERKILL RISK (Medium): Designed for enterprise multi-environment workflows

**Bias Check:** Potential "AWS ecosystem lock-in" bias - using AWS because we're already on AWS

**Adjusted R_eff:** 0.75