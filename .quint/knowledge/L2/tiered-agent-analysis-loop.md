---
scope: EdgeMind backend (lib/ai/index.js, lib/state.js), affects all enterprises, subsumes conservative/moderate/foundation hypotheses
kind: system
content_hash: null
---

# Hypothesis: Tiered Agent Analysis Loop

**Method:**
Replace the monolithic 30-second analysis loop with a three-tier system that separates cheap detection from expensive AI analysis.

**Tier 1 — Local Delta Detection (every 2 min, no AI):**
- Query InfluxDB, compare against previous snapshot
- Detect: metric changes > threshold, equipment state transitions
- No change = no action (no Bedrock call, no broadcast)

**Tier 2 — Targeted AI Analysis (event-driven by Tier 1):**
- Claude receives specific changes, not "analyze everything"
- Focused prompt with 2-3 targeted tool calls
- Produces deeper root cause analysis

**Tier 3 — Scheduled Summary (every 15 min):**
- Comprehensive analysis with enterprise rotation (A → B → C → cross-comparison)
- Deep dive into one enterprise per cycle
- Ensures periodic dashboard updates regardless of changes

**Deduplication:**
- In-memory Map with 30-min TTL
- Key: `${enterprise}-${equipment}-${anomalyType}`
- Prevents duplicate work orders

**Result:**
- ~95% reduction in Bedrock API calls (120/hr → 2-8/hr)
- Higher quality insights (targeted vs. shotgun)
- Quieter dashboard where each update is meaningful

## Rationale
{"anomaly": "Agentic loop calls Claude every 30s regardless of state changes, producing redundant insights and work order spam", "approach": "Tier the loop: cheap local checks detect changes, AI is only called when something meaningful happened or on a 15-min summary schedule", "alternatives_rejected": ["Conservative (interval + dedup alone — still talks every cycle)", "Moderate (severity scoring on noise — filters output not input)", "Foundation (config dashboard — mute button, not intelligence)"]}
