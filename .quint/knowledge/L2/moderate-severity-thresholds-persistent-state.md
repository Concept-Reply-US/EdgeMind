---
scope: EdgeMind backend (lib/ai/index.js, lib/influx/), requires InfluxDB schema extension, works with existing CMMS providers
kind: system
content_hash: b3ed7179c0e2904867365b1a83ed9a92
---

# Hypothesis: Moderate: Severity Thresholds + Persistent State

**Method:**
1. Add severity scoring system (0-100) based on:
   - Anomaly type (temperature spike = 80, minor drift = 20)
   - Duration (longer = higher score)
   - Equipment criticality (production line = higher than support equipment)
2. Store anomaly history in InfluxDB (measurement: `anomaly_log`)
   - Fields: equipment, type, severity, timestamp, work_order_id (if created)
3. Query recent anomalies (last 4 hours) before creating work orders
4. Only create work order if:
   - Severity >= configurable threshold (e.g., 60)
   - AND no work order exists for this equipment+type in last 4 hours
5. Keep 30s interval but filter aggressively

**Implementation:**
- Add severity calculation function in lib/ai/index.js
- Write anomalies to InfluxDB in anomaly_log measurement
- Query InfluxDB for recent work orders before CMMS call
- ~150 lines of code, requires schema extension

## Rationale
{"anomaly": "Agent creates work orders for every anomaly regardless of severity or recent history", "approach": "Add intelligent filtering based on severity scores and persistent anomaly history in InfluxDB", "alternatives_rejected": ["In-memory only (loses state on restart)", "No severity scoring (treats all anomalies equally)", "External state store like Redis (adds dependency)"]}