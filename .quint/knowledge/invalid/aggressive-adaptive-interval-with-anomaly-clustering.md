---
scope: EdgeMind backend (lib/ai/), requires new module + InfluxDB schema, assumes CMMS supports work order updates (MaintainX does)
kind: system
content_hash: c396239f8707a3bfdd93f750e18e9825
---

# Hypothesis: Aggressive: Adaptive Interval with Anomaly Clustering

**Method:**
1. **Adaptive Interval:** Dynamically adjust agent frequency based on factory state:
   - Quiet periods (no anomalies): 10 minutes
   - Normal operations: 2 minutes
   - Active anomalies detected: 30 seconds (for monitoring)
2. **Anomaly Clustering:** Group related anomalies into "incidents"
   - Use time proximity (within 5 min) + equipment proximity (same area/line)
   - Create ONE work order per incident cluster, not per anomaly
   - Track incident lifecycle: open → monitoring → resolved
3. **Stateful Incident Manager:**
   - Store incidents in InfluxDB with status field
   - Update existing incident if new anomaly matches cluster
   - Close incident when anomaly clears for 15+ minutes
4. **Work Order Strategy:**
   - Create work order only when incident transitions to "open"
   - Update work order with additional context as cluster grows
   - No new work orders for existing incidents

**Implementation:**
- New module: lib/ai/incident-manager.js
- Schema: `incidents` measurement in InfluxDB
- State machine for interval adjustment
- CMMS integration: update work orders instead of creating duplicates
- ~400 lines of code, significant architecture change

## Rationale
{"anomaly": "Fixed 30s interval ignores factory state, treats related anomalies as independent events", "approach": "Adaptive interval based on conditions + cluster related anomalies into incidents with single work order per incident", "alternatives_rejected": ["Fixed long interval (misses fast-developing issues)", "Per-anomaly work orders (creates spam)", "External incident management system (adds complexity)"]}