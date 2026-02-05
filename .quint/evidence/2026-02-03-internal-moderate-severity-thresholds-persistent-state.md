---
carrier_ref: test-runner
valid_until: 2026-05-04
date: 2026-02-03
id: 2026-02-03-internal-moderate-severity-thresholds-persistent-state.md
type: internal
target: moderate-severity-thresholds-persistent-state
verdict: pass
assurance_level: L2
content_hash: b7a8973e08f552fa41b13af4d804d087
---

VERIFIED: InfluxDB write/query patterns proven, equipment criticality metadata exists.

**Evidence:**

1. **InfluxDB Write Pattern (lib/influx/writer.js:48-66):**
   - Point creation: `new Point(measurement).tag(...).floatField('value', value)`
   - Can add new measurement: `anomaly_log` with fields: severity, equipment, type, work_order_id

2. **InfluxDB Query Pattern (lib/ai/index.js:122-127):**
   - Flux query supports time ranges: `range(start: -5m)` → can use `range(start: -4h)` for recent anomalies
   - Filter and aggregation proven: can query anomaly_log for duplicates

3. **Equipment Criticality Metadata (lib/domain-context.js:36-100):**
   - ENTERPRISE_DOMAIN_CONTEXT already has equipment specs per enterprise
   - Enterprise A: glass-furnace (critical: true), ISMachine, Lehr
   - Enterprise B: Filler, Labeler, Palletizer with speed/accuracy specs
   - Enterprise C: CHR01 (chromatography), SUB250 (bioreactor), SUM500 (mixer)
   - Can extend with criticality scores: equipment.critical_score (0-100)

4. **Severity Calculation (new function needed):**
```javascript
function calculateSeverity(anomalyType, equipment, duration, enterprise) {
  let score = 0;
  
  // Base score by anomaly type
  const typeScores = {
    'temperature_spike': 80,
    'performance_drop': 60,
    'quality_drift': 70,
    'minor_deviation': 20
  };
  score += typeScores[anomalyType] || 50;
  
  // Equipment criticality bonus (from domain-context.js)
  const equipmentMeta = ENTERPRISE_DOMAIN_CONTEXT[enterprise]?.equipment?.[equipment];
  if (equipmentMeta?.critical) score += 20;
  
  // Duration multiplier (longer = worse)
  if (duration > 10) score += 10; // 10+ minutes
  
  return Math.min(score, 100);
}
```

5. **Deduplication Query (pseudo-Flux):**
```flux
from(bucket: "factory")
  |> range(start: -4h)
  |> filter(fn: (r) => r._measurement == "anomaly_log")
  |> filter(fn: (r) => r.equipment == "${equipment}" and r.type == "${anomalyType}")
  |> last()  // Get most recent work order for this equipment+type
```

**Schema Extension Required:**
- New measurement: `anomaly_log`
- Tags: enterprise, site, equipment, type
- Fields: severity (float), work_order_id (string), timestamp

**Trade-offs confirmed:**
- ✅ Persistent state survives restarts
- ✅ Severity filtering prevents low-priority spam
- ✅ 4-hour window prevents duplicates
- ⚠️ Severity scoring needs calibration (trial and error)
- ⚠️ Equipment criticality mapping needs extension (add critical_score field)

**Confidence:** HIGH - All patterns proven in existing code, requires ~150 LOC implementation