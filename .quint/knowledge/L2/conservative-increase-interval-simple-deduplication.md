---
scope: EdgeMind backend (lib/ai/index.js), requires no schema changes, works with existing CMMS integration
kind: system
content_hash: cf6a6f215430463e6e94f4e40ec59a4d
---

# Hypothesis: Conservative: Increase Interval + Simple Deduplication

**Method:**
1. Increase TREND_ANALYSIS_INTERVAL from 30s to 5 minutes (10x reduction in frequency)
2. Add in-memory anomaly cache with TTL (e.g., 30 minutes)
3. Before creating work order: check if similar anomaly (same equipment + type) exists in cache
4. If duplicate found within TTL window: skip work order creation, increment counter instead

**Implementation:**
- In lib/ai/index.js, create a Map with key: `${equipment}-${anomalyType}`, value: `{timestamp, count}`
- On each agent run: filter out cached anomalies before calling CMMS
- Simple, minimal code changes (~30 lines)

## Rationale
{"anomaly": "Agent fires every 30s with no memory, creates duplicate work orders", "approach": "Reduce frequency + add basic deduplication cache to prevent duplicate alerts within short time windows", "alternatives_rejected": ["Do nothing (problem persists)", "Only increase interval (still creates duplicates)", "Only add cache (still fires too often)"]}