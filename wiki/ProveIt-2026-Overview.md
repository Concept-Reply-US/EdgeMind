# ProveIt! 2026 Conference Overview

EdgeMind is a real-time factory intelligence platform built specifically for the ProveIt! Conference 2026 demonstration. It connects to virtual factory MQTT brokers, stores time-series data in InfluxDB, and uses Claude AI to analyze trends and detect anomalies in real-time.

## What EdgeMind Demonstrates

EdgeMind showcases the convergence of industrial IoT and AI for manufacturing intelligence:

- **Real-time MQTT ingestion** from three virtual factory enterprises
- **Time-series storage** with InfluxDB for historical analysis
- **AI-powered trend analysis** using Claude to detect anomalies and patterns
- **Live WebSocket streaming** to a modern web dashboard
- **OEE calculation** with industry-specific tier-based methodology

## The Virtual Factory MQTT Broker

ProveIt! Conference provides a live MQTT broker with simulated factory data:

```
Broker:   virtualfactory.proveit.services
Port:     1883
Username: proveitreadonly
Password: proveitreadonlypassword
```

EdgeMind subscribes to all topics (`#`) and processes thousands of data points per minute across temperature, pressure, vibration, OEE metrics, production counts, and equipment states.

## The Three Enterprises

The virtual factory simulates three distinct manufacturing environments:

### Enterprise A: Glass Manufacturing

High-temperature industrial processing with strict thermal control requirements.

- **Sites:** Dallas Line 1, and additional production lines
- **Key Equipment:** Furnaces, IS Machines, Lehrs (annealing ovens)
- **Critical Metrics:** Furnace temperature (2650-2750 F), gob weight, defect counts
- **Industry Focus:** Thermal shock prevention, crown temperature monitoring, refractory wear

### Enterprise B: Beverage Bottling

High-speed packaging operations across multiple geographic sites.

- **Sites:** Site1 through Site9 (multi-facility operation)
- **Key Equipment:** Fillers, Labelers, Palletizers
- **Critical Metrics:** Bottles per minute, infeed/outfeed counts, reject rates
- **Industry Focus:** Line efficiency, changeover optimization, quality control

### Enterprise C: Bioprocessing / Pharma

Regulated batch manufacturing following ISA-88 standards.

- **Sites:** Specialized bioprocessing facilities
- **Key Equipment:** Single-use mixers (SUM), Bioreactors (SUB), Chromatography (CHROM), TFF filtration
- **Critical Metrics:** pH levels, dissolved oxygen, batch phase tracking
- **Industry Focus:** Contamination prevention, batch deviation detection, sterility assurance

## Key Demo Talking Points

### 1. Live Data Connection

"We're connected to the ProveIt! virtual factories right now. Every data point you see is streaming live from their MQTT broker."

### 2. AI-Powered Analysis

"Claude AI analyzes factory trends every 30 seconds. It's not just looking at individual values - it's understanding patterns across time and detecting anomalies that humans might miss."

### 3. Industry-Aware Context

"The system understands that Enterprise A is glass manufacturing, B is beverage bottling, and C is bioprocessing. It applies domain-specific knowledge to its analysis - furnace temperatures mean something different than filler speeds."

### 4. Production-Ready Architecture

"This isn't a mockup. The architecture - MQTT ingestion, time-series storage, WebSocket streaming, AI analysis - is the same pattern you'd use in production. Scale this with Kafka and you're ready for an entire manufacturing fleet."

### 5. Cost Efficiency

"The entire demo runs on approximately $0.50/day in Claude API costs. For a full week of the conference, we're looking at under $5 total for AI processing."

## System Architecture

```
ProveIt! MQTT Broker (virtualfactory.proveit.services:1883)
                    |
                    v
        Node.js Server (server.js)
        |           |           |
        v           v           v
    InfluxDB    WebSocket    Claude AI
    (storage)   (streaming)  (analysis)
        |           |           |
        +-----+-----+-----+-----+
              |
              v
        Web Dashboard (index.html)
```

## Cost Breakdown

| Component | Daily Cost | Conference Week |
|-----------|------------|-----------------|
| MQTT Connection | Free (ProveIt! provided) | Free |
| Claude API | ~$0.50/day | ~$3.50 |
| Hosting (EC2) | ~$0.20/day | ~$1.40 |
| InfluxDB | Included in hosting | Included |
| **Total** | **~$0.70/day** | **~$5** |

## Related Pages

- [[Live-Demo-Guide]] - Presenter's guide for the conference booth
- [[Factory-Enterprises-Explained]] - Deep dive into each enterprise's domain context
- [[Quick-Start]] - Getting the system running locally
