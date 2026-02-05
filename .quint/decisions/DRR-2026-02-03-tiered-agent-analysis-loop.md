---
type: DRR
winner_id: tiered-agent-analysis-loop
created: 2026-02-03T13:22:00-05:00
content_hash: null
---

# Tiered Agent Analysis Loop

## Context
EdgeMind's agentic loop fires every 30 seconds, calling Claude via AWS Bedrock with up to 9 tool calls per cycle (~120 Bedrock API calls/hour). Every cycle produces visible output regardless of whether anything changed. This creates alert fatigue, duplicate work orders, and significant API cost. The agent is also too narrow — it reports OEE numbers without investigating root causes, and when it does investigate, it covers all three enterprises superficially rather than any one deeply.

Three hypotheses were evaluated:
1. **Conservative** (increase interval + in-memory dedup) — addresses frequency but not the structural problem
2. **Moderate** (severity thresholds + InfluxDB persistence) — adds intelligent filtering but still runs analysis every cycle
3. **Foundation** (config dashboard) — gives operators knobs to tune, but tuning a noisy system just produces quieter noise

## Decision
**Selected Option:** Tiered Agent Analysis Loop — a new approach that subsumes the best elements of all three hypotheses while addressing the fundamental architectural issue.

The core insight: **not every check needs to call Claude.** Separate cheap local detection from expensive AI analysis.

### Three Tiers

**Tier 1 — Local Delta Detection (every 2 minutes, NO AI call):**
- Query InfluxDB for current metrics (reuse existing `queryTrends()`)
- Compare against previous snapshot in memory
- Compute deltas: did any key metric change by more than a configurable threshold (default 5%)?
- Track equipment state transitions (RUNNING→DOWN, DOWN→RUNNING)
- If nothing meaningful changed → do nothing. No Bedrock call. No broadcast.

**Tier 2 — Targeted AI Analysis (triggered by Tier 1 only when changes detected):**
- Claude receives the SPECIFIC changes, not "analyze the whole factory"
- Focused prompt: "Enterprise B availability dropped from 85% to 72%. Filler transitioned to DOWN. Investigate."
- Fewer tool calls (2-3 targeted, not 9 shotgunned)
- Produces deeper, more actionable insights

**Tier 3 — Scheduled Comprehensive Summary (every 15 minutes):**
- Full analysis regardless of changes
- Enterprise rotation: A → B → C → cross-enterprise comparison
- Deep dive into one enterprise per cycle instead of shallow scan of all three
- Ensures operators always see periodic updates

**Deduplication (from Conservative hypothesis):**
- In-memory anomaly cache with 30-minute TTL
- Key: `${enterprise}-${equipment}-${anomalyType}`
- Prevents duplicate work orders within window
- Cleanup on each Tier 1 check

## Rationale
The three original hypotheses all treated the symptom (too much noise) from different angles. None addressed the root cause: the agent has no concept of state transitions. It treats every 30-second window as a fresh analysis, which guarantees redundant output.

The tiered approach fundamentally changes the operating model:
- **Conservative's interval increase** is subsumed by Tier 1's 2-minute check cycle
- **Conservative's dedup cache** is incorporated directly
- **Moderate's severity scoring** can be added later (Phase 3) once the agent is only reporting meaningful changes — at that point you're scoring signal, not noise
- **Foundation's config dashboard** can be added last (Phase 4) once the system works well — operators get knobs that actually do something useful

Call pattern improvement:
```
Before:  🤖🤖🤖🤖🤖🤖🤖🤖🤖🤖  (~120 Bedrock calls/hour)
After:   ──────🤖──────────🤖───📊  (~2-5 calls/hour + 2-4 summaries)
```

Estimated 90-95% reduction in Bedrock API calls while producing higher-quality insights.

## Consequences
1. Dramatic reduction in Bedrock API usage and cost (~95%)
2. Insights are more actionable (specific changes vs. generic status reports)
3. Dashboard is quieter but each update is meaningful
4. Enterprise rotation gives deeper analysis per cycle
5. Dedup cache prevents work order spam
6. Trade-off: 2-minute detection latency (vs 30 seconds) — acceptable for manufacturing monitoring
7. Trade-off: In-memory dedup cache lost on restart (acceptable for demo, can add InfluxDB persistence later per Moderate hypothesis)
8. Trade-off: Tier 1 threshold tuning needed — too sensitive = still noisy, too conservative = misses changes

## Implementation Phases
- **Phase 1 (now):** Tier 1 + Tier 2 + Tier 3 + dedup cache
- **Phase 2 (later):** Add severity scoring from Moderate hypothesis
- **Phase 3 (later):** Add InfluxDB persistence for anomaly history
- **Phase 4 (post-demo):** Add config dashboard from Foundation hypothesis

## Alternatives Rejected (as standalone strategies)
- **Conservative alone:** Reduces frequency but every cycle still produces output. 5-minute interval is better than 30s but doesn't solve the "always talking" problem.
- **Moderate alone:** Severity scoring on top of a 30s loop means you're scoring noise 120 times an hour. Fix the input before filtering the output.
- **Foundation alone:** Giving operators a mute button is not intelligence. Config dashboard has value but only after the system produces quality output.

## Configuration
```
AGENT_CHECK_INTERVAL_MS=120000      # Tier 1: 2 minutes
AGENT_SUMMARY_INTERVAL_MS=900000    # Tier 3: 15 minutes
AGENT_CHANGE_THRESHOLD_PCT=5        # % change to trigger Tier 2
```
