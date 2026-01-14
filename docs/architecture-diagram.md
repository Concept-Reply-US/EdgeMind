# EdgeMind OPE Insights - Architecture Overview

**ProveIt! Conference 2026 Presentation**

> "Built in one day of working time" - Demonstrating that AI is accessible and applicable to manufacturing operations.

---

## Visual Architecture

### ASCII Diagram (Presentation-Ready)

```
                           EDGEMIND OPE INSIGHTS ARCHITECTURE
    ================================================================================

    DATA SOURCES (ProveIt Virtual Factory)
    +------------------------------------------+
    |  MQTT Broker: virtualfactory.proveit.services:1883
    |  +------------+  +------------+  +------------+
    |  | Enterprise |  | Enterprise |  | Enterprise |
    |  |   Glass    |  |  Beverage  |  |   Pharma   |
    |  |    Mfg     |  |   Bottling |  |   Mfg      |
    |  +-----+------+  +-----+------+  +-----+------+
    |        |               |               |
    +--------|---------------|---------------|----------+
             |               |               |
             +-------+-------+-------+-------+
                     |
                     | MQTT Subscribe '#' (all topics)
                     v
    +=====================================+
    |         EDGEMIND SERVER             |
    |        (Node.js/Express)            |
    |-------------------------------------|
    |  +-------------+  +-------------+   |
    |  | MQTT Client |  | WebSocket   |   |
    |  | (ingestion) |  | Server      |   |
    |  +------+------+  +------+------+   |
    |         |                |          |
    |         v                |          |
    |  +-------------+         |          |
    |  | Data Router |         |          |
    |  +------+------+         |          |
    |         |                |          |
    +=========|================|==========+
              |                |
              v                |
    +-----------------+        |
    |    InfluxDB     |        |
    |  Time-Series    |        |
    |    Storage      |        |
    |  bucket:factory |        |
    +--------+--------+        |
             |                 |
             | Query (5-min    |
             | rolling window) |
             v                 |
    +=====================================+
    |       AGENTIC ANALYSIS LOOP         |
    |         (Every 30 seconds)          |
    |-------------------------------------|
    |                                     |
    |   InfluxDB  ---> EdgeMind Server    |
    |      |               |              |
    |      |    Bedrock    |              |
    |      |      API      v              |
    |      |        +-------------+       |
    |      +------->| Claude      |       |
    |               | Sonnet 4    |       |
    |               | (Analysis)  |       |
    |               +------+------+       |
    |                      |              |
    |    JSON Insights:    |              |
    |    - Anomalies       |              |
    |    - Trends          |              |
    |    - Recommendations |              |
    |                      v              |
    +=====================|===============+
                          |
          +---------------+---------------+
          |                               |
          v                               v
    +-------------+               +---------------+
    |  Dashboard  |               |   MaintainX   |
    |  (Browser)  |               |     CMMS      |
    |-------------|               |---------------|
    | Real-time   |               | Work Orders   |
    | WebSocket   |               | (High-        |
    | Updates     |               |  Severity)    |
    +-------------+               +---------------+
```

### Simplified Flow Diagram

```
    +----------+     +----------+     +----------+
    |  Glass   |     | Beverage |     |  Pharma  |
    |   Mfg    |     | Bottling |     |   Mfg    |
    +----+-----+     +----+-----+     +----+-----+
         |               |               |
         +-------+-------+-------+-------+
                 |
                 v
         +-------+-------+
         |  MQTT Broker  |
         | (ProveIt Demo)|
         +-------+-------+
                 |
                 | Subscribe '#'
                 v
         +-------+-------+
         |   EdgeMind    |-------> InfluxDB
         |   Server      |         (Storage)
         +-------+-------+
                 |
                 | Every 30s
                 v
         +-------+-------+
         |  AWS Bedrock  |
         |  Claude AI    |
         +-------+-------+
                 |
         +-------+-------+
         |               |
         v               v
    +---------+    +-----------+
    |Dashboard|    | MaintainX |
    | (Live)  |    | (CMMS)    |
    +---------+    +-----------+
```

---

## Component Details

### 1. Data Sources - ProveIt Virtual Factory

| Component | Details |
|-----------|---------|
| **Broker** | `virtualfactory.proveit.services:1883` |
| **Protocol** | MQTT v3.1.1 |
| **Authentication** | Username/password |
| **Enterprises** | Glass Manufacturing, Beverage Bottling, Pharmaceutical Manufacturing |
| **Data Types** | OEE metrics, equipment states, production counts, quality metrics |

**Topic Structure:**
```
{Enterprise}/{Site}/{Area}/{Machine}/{Measurement}

Examples:
- Glass Mfg/Plant A/Line 1/Filler/OEE
- Beverage Bottling/Chicago/Line 2/Labeler/State
- Pharma Mfg/Boston/Packaging/Cartoner/GoodCount
```

### 2. Data Ingestion - EdgeMind Server

| Component | Details |
|-----------|---------|
| **Runtime** | Node.js 18+ with Express |
| **MQTT Client** | Subscribes to `#` (all topics) |
| **WebSocket** | Real-time broadcast to connected clients |
| **Port** | 3000 (HTTP + WebSocket) |

**Key Capabilities:**
- Parses all incoming MQTT messages
- Routes numeric data to InfluxDB
- Maintains equipment state cache
- Throttles WebSocket broadcasts (every 10th message)

### 3. Time-Series Storage - InfluxDB

| Component | Details |
|-----------|---------|
| **Version** | InfluxDB 2.7 |
| **Organization** | `proveit` |
| **Bucket** | `factory` |
| **Retention** | 7 days (configurable) |
| **Query Language** | Flux |

**Data Schema:**
```
Measurement: {measurement_name}
Tags:
  - enterprise: {enterprise_name}
  - site: {site_name}
  - area: {area_name}
  - machine: {machine_name}
Fields:
  - value: {numeric_value}
Timestamp: {nanosecond_precision}
```

### 4. AI/ML Analysis - AWS Bedrock

| Component | Details |
|-----------|---------|
| **Service** | AWS Bedrock |
| **Model** | Claude Sonnet 4 (`us.anthropic.claude-sonnet-4-20250514-v1:0`) |
| **Region** | us-east-1 |
| **Interval** | Every 30 seconds |
| **Context Window** | 5-minute rolling window |

**Agentic Workflow:**
1. Query InfluxDB for 5-minute trend data
2. Format data as JSON with schema context
3. Send to Claude with analysis prompt
4. Receive structured insights (anomalies, trends, recommendations)
5. Broadcast insights via WebSocket
6. Trigger CMMS work orders for high-severity issues

**Example Insight Output:**
```json
{
  "anomalies": [
    {
      "severity": "high",
      "enterprise": "Glass Mfg",
      "machine": "Filler",
      "metric": "OEE",
      "observation": "OEE dropped from 85% to 62% in 3 minutes",
      "recommendation": "Check filler vacuum pressure and bottle alignment"
    }
  ],
  "trends": [
    {
      "type": "degradation",
      "metric": "Quality",
      "direction": "declining",
      "rate": "-2.3% per minute"
    }
  ]
}
```

### 5. Frontend - Live Dashboard

| Component | Details |
|-----------|---------|
| **Technology** | Vanilla JavaScript (no framework) |
| **Connection** | WebSocket to `ws://server:3000` |
| **Updates** | Real-time (sub-second latency) |
| **Charts** | Chart.js for visualizations |

**Dashboard Features:**
- Real-time OEE gauges per enterprise
- Equipment state indicators (Running/Idle/Faulted)
- AI-generated insights panel
- Anomaly alerts with severity coloring
- Trend charts (5-minute window)

### 6. CMMS Integration - MaintainX

| Component | Details |
|-----------|---------|
| **Platform** | MaintainX API |
| **Trigger** | High-severity anomalies |
| **Automation** | Work orders created automatically |
| **Data Included** | Machine, anomaly description, AI recommendation |

**Work Order Flow:**
```
High-Severity Anomaly Detected
         |
         v
    Create Work Order
    - Title: [Machine] - [Anomaly Type]
    - Description: AI analysis + recommendation
    - Priority: Based on severity
         |
         v
    MaintainX Notification
    - Mobile push to maintenance team
    - Email notification
```

---

## Data Flow Summary

### Real-Time Path (Milliseconds)
```
MQTT Message --> EdgeMind Server --> WebSocket --> Dashboard
     |
     +--> InfluxDB (async write)
```

### Analysis Path (30-second cycle)
```
InfluxDB Query --> EdgeMind Server --> AWS Bedrock --> Claude Analysis
     |                                                      |
     |                   +----------------------------------+
     |                   |
     |                   v
     |            Structured Insights
     |                   |
     |       +-----------+-----------+
     |       |                       |
     v       v                       v
Dashboard Update            MaintainX Work Order
(WebSocket broadcast)       (if high severity)
```

---

## Key Presentation Points

### Why This Architecture Matters

1. **Speed to Value**: Built in one day of focused development time
   - Demonstrates AI accessibility for manufacturing teams
   - No ML expertise required - uses pre-trained models

2. **Agentic AI**: Not just static analysis
   - Continuous 30-second analysis loop
   - Context-aware recommendations
   - Automated action triggers (CMMS integration)

3. **Integration-Ready**: Works with existing systems
   - Standard MQTT for industrial data
   - REST/WebSocket for dashboards
   - CMMS API for work order automation

4. **Real-Time Visibility**: Sub-second latency
   - WebSocket push (not polling)
   - Live equipment state tracking
   - Instant anomaly alerts

### Technical Differentiators

| Traditional Approach | EdgeMind Approach |
|---------------------|-------------------|
| Batch analysis (hourly/daily) | Real-time analysis (30s cycles) |
| Rule-based alerts | AI-driven pattern recognition |
| Manual work orders | Automated CMMS integration |
| Dashboard polling | WebSocket push updates |
| Siloed data | Unified multi-enterprise view |

---

## Deployment Options

### Local Development
```bash
docker compose up -d
# Access at http://localhost:3000
```

### AWS Production
- ECS Fargate for EdgeMind Server
- Amazon Timestream or managed InfluxDB
- CloudWatch for monitoring
- See `infra/` for Terraform configurations

---

## Files Reference

| File | Purpose |
|------|---------|
| `server.js` | Main backend - MQTT, InfluxDB, WebSocket, Bedrock integration |
| `index.html` | Production dashboard |
| `docker-compose.yml` | Local development stack |
| `docs/edgemind_architecture.mmd` | Mermaid diagram source |
| `docs/edgemind_architecture_python.png` | Python-generated diagram |

---

## Contact

For questions about this architecture or the ProveIt demonstration:
- See `CLAUDE.md` for detailed technical documentation
- See `CONTRIBUTING.md` for development guidelines
