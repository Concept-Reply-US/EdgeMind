# Project Context (A.2.6 Context Slice)

## Slice: Grounding (Infrastructure)
> The physical/virtual environment where the code runs.
- **Platform:** AWS ECS Fargate (production), Local Docker (development)
- **Region:** us-east-1
- **Storage:** InfluxDB (time-series), S3 (frontend static), CloudFront (CDN)
- **MQTT Broker:** virtualfactory.proveit.services:1883 (ProveIt! Conference)
- **Production URL:** https://edge-mind.concept-reply-sandbox.com

## Slice: Tech Stack (Software)
> The capabilities available to us.
- **Language:** Node.js 18+ (JavaScript)
- **Framework:** Express 4.18 + WebSocket (ws 8.16)
- **Database:** InfluxDB 2.7 (time-series)
- **AI:** AWS Bedrock (Claude Sonnet) for trend analysis
- **MQTT:** mqtt.js 5.3.4 (Paho-compatible)
- **Frontend:** Vanilla JS ES modules, Chart.js, no framework
- **Testing:** Jest 30.2

## Slice: Constraints (Normative)
> The rules we cannot break.
- **Compliance:** ProveIt! Conference hackathon requirements (CESMII SM Profiles)
- **Budget:** AWS Fargate (existing infrastructure)
- **Team:** Solo developer + AI agents
- **Timeline:** Hackathon deadline (ProveIt! Conference 2026)
- **Dependencies:** Must integrate with existing MQTT topic structure (Enterprise A/B/C)
- **Protocols:** MQTT primary, REST API secondary, WebSocket for real-time frontend
