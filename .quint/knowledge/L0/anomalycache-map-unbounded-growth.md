---
scope: lib/ai/index.js lines 86, 1437-1440
kind: system
content_hash: 821678aa489dc392c83c05b219f62f10
---

# Hypothesis: anomalyCache Map Unbounded Growth

The `anomalyCache` Map in lib/ai/index.js (line 86) has a comment claiming "30-min TTL" but NO cleanup code exists. The Map grows indefinitely as new anomalies are detected. Fix: Add setInterval that iterates entries and deletes those older than 30 minutes.

## Rationale
{"anomaly": "anomalyCache Map grows indefinitely over days/weeks of server uptime", "approach": "Implement actual TTL cleanup via setInterval every 5 minutes", "alternatives_rejected": ["WeakMap (not suitable for string keys)", "LRU cache library (adds dependency)"]}