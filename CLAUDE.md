# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time factory intelligence dashboard for the ProveIt! Conference 2026. Connects to a virtual factory MQTT broker, stores time-series data in InfluxDB, and uses Claude AI to analyze trends and detect anomalies.

## Architecture

```
MQTT Broker (virtualfactory.proveit.services:1883)
    ↓ (subscribes to '#' - all topics)
Node.js Server (server.js)
    ├── Writes all numeric data to InfluxDB
    ├── Throttled WebSocket broadcast (every 10th message)
    └── Agentic Loop (every 30 seconds):
            ↓
        Queries InfluxDB (5-minute rolling window, 1-min aggregates)
            ↓
        Claude analyzes trends (not raw data)
            ↓
        Broadcasts insights via WebSocket
            ↓
Frontend (factory-live.html) ← WebSocket (port 8080)
```

**Key Components:**
- `server.js` - Backend: MQTT client, InfluxDB writer, WebSocket server, Claude agentic loop
- `factory-live.html` - Live dashboard with WebSocket connection to backend
- `factory-command-center.html` - Static mockup version (no backend connection)

## Commands

```bash
# Install dependencies
npm install

# Start the server (requires InfluxDB running)
npm start

# Start with auto-reload (development)
npm run dev

# Start InfluxDB (Docker required)
docker run -d --name influxdb -p 8086:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=proveit2026 \
  -e DOCKER_INFLUXDB_INIT_ORG=proveit \
  -e DOCKER_INFLUXDB_INIT_BUCKET=factory \
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=proveit-factory-token-2026 \
  influxdb:2.7

# Check server health
curl http://localhost:3000/health

# Query trends API
curl http://localhost:3000/api/trends
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude AI analysis
- `PORT` - HTTP server port (default: 3000)

## MQTT Topic Structure

Topics from ProveIt! virtual factory follow this pattern:
```
Enterprise {A|B|C}/Site{N}/area/machine/component/metric/type
```

Examples:
- `Enterprise A/Dallas Line 1/packaging/...`
- `Enterprise B/Site3/palletizing/palletizermanual01/workstation/metric/oee`

## Key Configuration (server.js)

- `TREND_ANALYSIS_INTERVAL` - How often Claude analyzes trends (default: 30000ms)
- `range(start: -5m)` in Flux query - Time window for trend analysis
- WebSocket throttling - Only broadcasts every 10th MQTT message to avoid overwhelming frontend

## WebSocket Message Types

**Server → Client:**
- `initial_state` - Sent on connection with recent messages, insights, stats
- `mqtt_message` - Real-time MQTT data (throttled)
- `trend_insight` - Claude's trend analysis results

**Client → Server:**
- `get_stats` - Request current statistics
- `ask_claude` - Send a question to Claude with factory context

## InfluxDB Schema

Data is written with these tags:
- `enterprise`, `site`, `area`, `machine`, `full_topic`

Field: `value` (float for numeric, string otherwise)

Measurement name: last 2 parts of topic joined with underscore
