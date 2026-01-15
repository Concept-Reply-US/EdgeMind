---
target: hybrid-ecs-backend-s3-cloudfront-frontend
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-audit_report-hybrid-ecs-backend-s3-cloudfront-frontend.md
type: audit_report
content_hash: 172f0fd348d4bdd5853bbe8f3bf5162a
---

**Evidence Quality:** External research (CL2) - AWS Prescriptive Guidance explicitly recommends this pattern. Highest confidence.

**WLNK Analysis:** No dependencies declared. Self-contained hypothesis.

**Risk Factors:**
1. COMPLEXITY RISK (Low): Two deployment pipelines, but each is simple (s3 sync, ECR push).
2. CORS RISK (Low): Need to configure CORS headers for cross-origin WebSocket. Well-documented.
3. DNS RISK (Low): Need separate subdomain for WebSocket backend. Standard practice.

**Bias Check:**
- Pet Idea? No - AWS-endorsed pattern in official documentation.
- NIH? No - industry standard architecture.

**Adjusted R_eff:** 0.90 (external evidence, but AWS-endorsed pattern increases confidence)