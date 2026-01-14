# EdgeMind OPE Insights: Cost Breakdown

**ProveIt Conference 2026 | Cost Analysis for AI-Powered Factory Monitoring**

---

## Executive Summary

AI-powered factory monitoring is **not** enterprise-only technology. EdgeMind demonstrates that real-time OEE analysis with Claude AI can run for **under $150/month** in demo scenarios and scale to production for **$300-600/month** depending on usage.

---

## Architecture Cost Components

```
Factory Floor (MQTT)
        |
        v
+------------------+     +------------------+
|  EC2 t3.medium   |---->|   AWS Bedrock    |
|  (Node.js +      |     |   (Claude AI)    |
|   InfluxDB)      |     +------------------+
+------------------+
        |
        v
   Dashboard Users
```

---

## 1. Demo Scenario (Conference/POC)

**Use case:** ProveIt conference demo, short-term POC, development

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 Instance** | t3.medium (2 vCPU, 4GB RAM) | $30.37 |
| **EBS Storage** | 20GB gp3 | $1.60 |
| **AWS Bedrock (Claude)** | ~2,880 calls/day @ 30s interval | $86.40 |
| **Data Transfer** | ~10GB outbound (WebSocket) | $0.90 |
| **MaintainX** | Free tier (up to 10 work orders) | $0.00 |
| | | |
| **Total** | | **$119.27/month** |

### Bedrock Cost Calculation (Demo)

```
Analysis interval:     1 per 30 seconds
Calls per day:         2,880 (24h * 60min * 2/min)
Calls per month:       86,400

Claude Sonnet 4 Pricing (us-east-1):
- Input:  $3.00 per 1M tokens
- Output: $15.00 per 1M tokens

Per-call estimate:
- Input:  2,500 tokens  = $0.0075
- Output: 750 tokens    = $0.01125
- Total per call:       = $0.01875

Monthly Bedrock cost:   86,400 * $0.01 = $864
                        (with 90% caching) = ~$86.40
```

**Note:** EdgeMind uses trend aggregation, so Claude receives pre-summarized data (2-3K tokens) rather than raw sensor streams. This reduces costs by 10-100x compared to naive implementations.

---

## 2. Production Scenario (Single Factory)

**Use case:** Full production deployment, 24/7 monitoring, multiple users

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 Instance** | t3.large (2 vCPU, 8GB RAM) | $60.74 |
| **EBS Storage** | 50GB gp3 (30-day retention) | $4.00 |
| **AWS Bedrock (Claude)** | ~2,880 calls/day + user Q&A (~500/day) | $112.00 |
| **Data Transfer** | ~50GB outbound | $4.50 |
| **Application Load Balancer** | ALB + LCU hours | $22.00 |
| **CloudWatch** | Logs + metrics (10GB) | $5.00 |
| **MaintainX** | Essential tier (if needed) | $16.00 |
| | | |
| **Total** | | **$224.24/month** |

---

## 3. Production Scenario (Multi-Site)

**Use case:** Enterprise deployment, multiple factories, HA requirements

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **ECS Fargate** | 2 tasks x 0.5 vCPU, 1GB (HA) | $29.00 |
| **RDS for InfluxDB** | db.t3.medium (managed) | $50.00 |
| **AWS Bedrock (Claude)** | ~5,000 calls/day (multi-site) | $250.00 |
| **Data Transfer** | ~100GB outbound | $9.00 |
| **Application Load Balancer** | ALB + LCU hours | $25.00 |
| **CloudWatch** | Logs + metrics + alarms | $15.00 |
| **Secrets Manager** | 4 secrets | $1.60 |
| **NAT Gateway** | Single AZ (cost-optimized) | $32.00 |
| **MaintainX** | Professional tier | $49.00 |
| | | |
| **Total** | | **$460.60/month** |

---

## Component Deep Dive

### AWS EC2 Pricing (us-east-1)

| Instance Type | vCPU | Memory | On-Demand | 1-Year Reserved | 3-Year Reserved |
|--------------|------|--------|-----------|-----------------|-----------------|
| t3.small | 2 | 2 GB | $15.18/mo | $9.49/mo | $6.13/mo |
| t3.medium | 2 | 4 GB | $30.37/mo | $18.98/mo | $12.26/mo |
| t3.large | 2 | 8 GB | $60.74/mo | $37.96/mo | $24.53/mo |

**Recommendation:** Start with t3.medium. The Node.js server and InfluxDB together use ~1.5GB RAM under typical load.

### AWS Bedrock (Claude Sonnet 4) Pricing

| Metric | Price |
|--------|-------|
| Input tokens | $3.00 / 1M tokens |
| Output tokens | $15.00 / 1M tokens |
| Prompt caching (write) | $3.75 / 1M tokens |
| Prompt caching (read) | $0.30 / 1M tokens |

**Cost Optimization:** EdgeMind's system prompt is cached, reducing input costs by ~90% on subsequent calls.

### InfluxDB Options

| Option | Monthly Cost | Notes |
|--------|--------------|-------|
| Self-hosted on EC2 | $0 (included in EC2) | Recommended for demos |
| InfluxDB Cloud Free | $0 | 30-day retention, limited writes |
| InfluxDB Cloud Usage | ~$0.002/MB written | Pay-per-use |
| InfluxDB Cloud Annual | $500+/year | Dedicated resources |

**Recommendation:** Self-hosted InfluxDB on EC2 for maximum control and cost efficiency.

### Data Transfer Costs

| Type | Volume | Cost |
|------|--------|------|
| MQTT inbound | Millions/day | $0.00 (inbound free) |
| WebSocket outbound | ~1KB per broadcast | $0.09/GB |
| Bedrock API calls | ~3KB per call | Included in Bedrock pricing |

---

## Cost Optimization Strategies

### 1. Reduce Bedrock Costs (Biggest Lever)

| Strategy | Savings |
|----------|---------|
| **Increase analysis interval** (30s -> 60s) | 50% reduction |
| **Use prompt caching** (already implemented) | 80-90% on input tokens |
| **Aggregate before analysis** (already implemented) | 10-100x vs raw data |
| **Batch low-priority analyses** | Variable |

### 2. Reduce Compute Costs

| Strategy | Savings |
|----------|---------|
| **Reserved Instances** (1-year) | 37% reduction |
| **Reserved Instances** (3-year) | 60% reduction |
| **Spot Instances** (dev only) | 70-90% reduction |
| **Right-size instance** | Variable |

### 3. Reduce Storage Costs

| Strategy | Savings |
|----------|---------|
| **Reduce retention period** (30 -> 7 days) | 75% reduction |
| **Use InfluxDB downsampling** | 50-90% reduction |
| **gp3 vs gp2** | 20% reduction |

---

## Traditional Analytics vs AI-Powered

| Approach | Setup Cost | Monthly Cost | Time to Value |
|----------|------------|--------------|---------------|
| **Traditional BI Tools** | | | |
| Tableau + data warehouse | $10K+ | $500-2,000 | 3-6 months |
| Power BI + Azure SQL | $5K+ | $300-800 | 2-4 months |
| Custom analytics platform | $50K+ | $1,000+ | 6-12 months |
| | | | |
| **EdgeMind (AI-Powered)** | | | |
| Demo deployment | $0 | $120 | 1 day |
| Production deployment | $0 | $225-460 | 1 week |

### What You Get with EdgeMind

| Feature | Traditional | EdgeMind |
|---------|-------------|----------|
| Real-time monitoring | Requires custom dev | Built-in |
| Anomaly detection | Rules-based, manual | AI-powered, automatic |
| Natural language Q&A | Not available | Built-in |
| Trend analysis | Manual dashboards | Automatic insights |
| Recommendations | Manual SOP lookup | AI-generated |
| Setup complexity | High | Low (Docker Compose) |

---

## Free Tier Opportunities

| Service | Free Tier Details |
|---------|-------------------|
| **AWS Free Tier** | 750 hrs/mo t2.micro (first 12 months) |
| **AWS Bedrock** | No free tier, but low per-call cost |
| **InfluxDB Cloud** | 30-day retention, 10K writes/5min |
| **MaintainX** | Up to 10 work orders/month |
| **CloudWatch** | 10 custom metrics, 5GB logs |

---

## Scenario: 7-Day Conference Demo

**Absolute minimum cost for ProveIt Conference:**

| Component | Cost |
|-----------|------|
| EC2 t3.medium (7 days) | $7.09 |
| EBS 20GB (7 days) | $0.37 |
| Bedrock (~20K calls) | $200.00 |
| Data transfer (~5GB) | $0.45 |
| | |
| **Total for 1-week demo** | **$207.91** |

**With cost optimizations (60s interval, aggressive caching):**

| Component | Cost |
|-----------|------|
| EC2 t3.medium (7 days) | $7.09 |
| EBS 20GB (7 days) | $0.37 |
| Bedrock (~10K calls, cached) | $20.00 |
| Data transfer (~5GB) | $0.45 |
| | |
| **Optimized 1-week demo** | **$27.91** |

---

## Key Takeaways for ProveIt Audience

1. **AI monitoring is affordable.** Full production deployment costs less than a single enterprise software license.

2. **No upfront investment.** Pay-as-you-go pricing means you can start small and scale.

3. **Fast time to value.** Deploy in a day, not months. See insights immediately.

4. **Cost scales with value.** More analysis = more insights. You control the dial.

5. **Open architecture.** No vendor lock-in. Self-hosted InfluxDB, standard MQTT, portable code.

---

## Appendix: Pricing References

- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [AWS EBS Pricing](https://aws.amazon.com/ebs/pricing/)
- [InfluxDB Cloud Pricing](https://www.influxdata.com/influxdb-pricing/)
- [MaintainX Pricing](https://www.getmaintainx.com/pricing/)

*Prices as of January 2026. Verify current pricing before deployment.*

---

**Questions?** This cost breakdown is designed for transparency. The EdgeMind architecture prioritizes cost efficiency through pre-aggregation, caching, and right-sized infrastructure.
