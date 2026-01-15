---
type: audit_report
target: ecs-ec2-with-immutable-ami
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-audit_report-ecs-ec2-with-immutable-ami.md
content_hash: b6db8cbb655514fb1e34a49b227fd1dc
---

**Evidence Quality:** External research (CL2) - AWS documentation on ECS EC2 launch type.

**WLNK Analysis:** No dependencies declared. Self-contained hypothesis.

**Risk Factors:**
1. OPERATIONAL RISK (High): AMI management adds ongoing burden - Packer scripts, security patching, rotation schedules.
2. COST-BENEFIT RISK (Medium): Saves ~$15-25/month but adds engineering time that likely exceeds savings for small project.
3. COMPLEXITY RISK (Medium): More moving parts than Fargate (AMI pipeline + ECS orchestration).

**Bias Check:**
- Pet Idea? Possible - "keep EC2 for cost savings" may be anchoring on current architecture.
- NIH? No.

**Adjusted R_eff:** 0.70 (external evidence, high operational risk, potential anchoring bias)