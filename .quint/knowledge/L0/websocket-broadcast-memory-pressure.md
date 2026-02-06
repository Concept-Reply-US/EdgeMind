---
scope: server.js lines 578-585 broadcastToClients function
kind: system
content_hash: 252684668b8d171d056467c74c802bd3
---

# Hypothesis: WebSocket Broadcast Memory Pressure

broadcastToClients() (server.js lines 578-585) creates JSON.stringify() output for every broadcast. At 100 messages/second with multiple clients, this creates significant memory pressure on write buffers. No backpressure handling exists. Fix: Create payload string once, add client buffer monitoring.

## Rationale
{"anomaly": "WebSocket broadcasts create memory pressure at scale", "approach": "Single stringify per broadcast, add backpressure handling for slow clients", "alternatives_rejected": ["Message queuing library (overkill for this use case)", "Batching (would add latency)"]}