---
target: full-fargate-deployment
verdict: pass
assurance_level: L2
carrier_ref: test-runner
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-external-full-fargate-deployment.md
type: external
content_hash: bdf4adc437236d6265f3ed9dc45962b5
---

VALIDATED via AWS documentation and pricing research:

**WebSocket Support:** ALB natively supports WebSocket with automatic connection upgrades. WebSocket connections are inherently sticky - no additional stickiness configuration needed. Max idle timeout 4000 seconds.

**Pricing Reality:** Fargate is 2-3x more expensive than EC2 for always-on workloads. For EdgeMind's small footprint (1 vCPU, 2GB RAM estimate), monthly cost ~$30-50 vs ~$15 EC2. Compute Savings Plans can reduce by 20-52%.

**Operational Benefit Confirmed:** Zero infrastructure management, automatic security patching, no AMI maintenance.

Sources: AWS Fargate Pricing, AWS ALB WebSocket docs, CloudBurn calculator, FargatevsEC2.com