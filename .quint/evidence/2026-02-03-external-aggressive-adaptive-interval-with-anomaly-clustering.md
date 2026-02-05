---
id: 2026-02-03-external-aggressive-adaptive-interval-with-anomaly-clustering.md
type: external
target: aggressive-adaptive-interval-with-anomaly-clustering
verdict: refine
assurance_level: L1
carrier_ref: test-runner
valid_until: 2026-05-04
date: 2026-02-03
content_hash: 506224186d16a0b84d0bff686b7a27e9
---

PARTIALLY VERIFIED: Incident clustering and adaptive intervals feasible, BUT work order updates UNCONFIRMED.

**Evidence:**

1. **Adaptive Interval State Machine:**
   - Can implement via simple state tracking in lib/ai/index.js
   - Use anomalyCache (from Conservative) to track recent anomaly count
   - Adjust setInterval dynamically:
```javascript
let currentInterval = 600000; // Start at 10 min (quiet)
function adjustInterval() {
  const recentAnomalies = countRecentAnomalies(); // last 15 min
  if (recentAnomalies === 0) currentInterval = 600000; // Quiet: 10 min
  else if (recentAnomalies < 3) currentInterval = 120000; // Normal: 2 min
  else currentInterval = 30000; // Active: 30 sec
  
  clearInterval(agentLoop);
  agentLoop = setInterval(analyzeFactoryTrends, currentInterval);
}
```

2. **Incident Clustering:**
   - InfluxDB schema supports incident storage (same pattern as anomaly_log)
   - Clustering algorithm:
```javascript
function clusterAnomalies(newAnomaly, recentAnomalies) {
  for (const existing of recentAnomalies) {
    const timeProximity = Math.abs(newAnomaly.timestamp - existing.timestamp) < 5*60*1000; // 5 min
    const locationProximity = newAnomaly.area === existing.area || newAnomaly.site === existing.site;
    if (timeProximity && locationProximity) {
      return existing.incidentId; // Match found, add to cluster
    }
  }
  return null; // New incident
}
```

3. **Incident State Machine:**
   - Incident lifecycle: OPEN → MONITORING → RESOLVED
   - Store in InfluxDB measurement: `incidents`
   - Fields: status, cluster_size, first_anomaly_ts, last_updated_ts

**CRITICAL BLOCKER:**
4. **MaintainX Work Order Updates:**
   - Current implementation (lib/cmms-maintainx.js) only has `createWorkOrder()` method
   - No `updateWorkOrder()` method exists
   - WebSearch unavailable to verify PATCH /workorders/{id} support
   - Documentation (docs/project_notes/key_facts.md:189-195) only mentions creation, not updates

**Workarounds:**
- Option A: Add comment/note to original work order instead of update (creates new work order for each cluster member)
- Option B: Implement PATCH support (assumes MaintainX API supports it, needs verification)
- Option C: Store incident context in InfluxDB only, don't update CMMS (single work order per incident, no updates)

**Trade-offs:**
- ✅ Adaptive interval reduces LLM waste during quiet periods
- ✅ Incident clustering prevents duplicate alerts for related anomalies
- ✅ InfluxDB incident storage survives restarts
- ❌ Work order update capability UNVERIFIED (blocker for full implementation)
- ⚠️ State machine complexity introduces edge case risks (stuck states, manual intervention needed)

**Confidence:** MEDIUM - Core logic feasible but depends on unverified MaintainX API capability