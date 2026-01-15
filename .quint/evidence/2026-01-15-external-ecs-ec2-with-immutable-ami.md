---
valid_until: 2026-04-15
date: 2026-01-15
id: 2026-01-15-external-ecs-ec2-with-immutable-ami.md
type: external
target: ecs-ec2-with-immutable-ami
verdict: pass
assurance_level: L2
carrier_ref: test-runner
content_hash: aa95c5f359522c207190605934d80d8f
---

VALIDATED but with caveats:

**Cost Advantage Confirmed:** EC2 is 2-3x cheaper than Fargate for always-on workloads. With Reserved Instances, can be 6-9x cheaper at scale.

**Operational Overhead Confirmed:** Requires AMI management (Packer builds, security patching, rotation). AWS docs recommend EC2 when you need "fine-grained control" but acknowledge it "requires you to manage instance patching, capacity planning, and cluster scaling."

**WebSocket Works Same:** ALB WebSocket support identical whether backend is Fargate or EC2.

**Trade-off Assessment:** Saves ~$15-25/month but adds AMI pipeline maintenance. For a demo/conference project, this overhead likely exceeds the cost savings in engineering time.

Sources: AWS ECS Pricing docs, AWS re:Post cost comparison threads, Rafay EC2 vs Fargate analysis