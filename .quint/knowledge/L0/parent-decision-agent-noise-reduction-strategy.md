---
kind: episteme
scope: EdgeMind agentic loop (lib/ai/index.js), applies to all enterprises/sites in the factory dashboard
content_hash: 45a867ff320c1e75782a949dbbb93e15
---

# Hypothesis: Parent Decision: Agent Noise Reduction Strategy

Decision context for grouping alternative approaches to reduce agentic loop noise and work order spam. This is the parent decision that competing hypotheses will reference.

## Resolution

**Winner: Tiered Agent Analysis Loop** (DRR-2026-02-03-tiered-agent-analysis-loop)

The three original hypotheses (Conservative, Moderate, Foundation) each addressed symptoms. The tiered approach addresses the root cause: the agent has no concept of state transitions and calls AI on every cycle regardless of whether anything changed. The winning strategy subsumes the best elements of all three: Conservative's dedup cache, Moderate's severity path (Phase 2), and Foundation's configurability (Phase 4).

## Rationale
{"anomaly": "Agentic loop fires every 30s with no memory, creating duplicate work orders and alert fatigue", "approach": "Evaluate multiple strategies for reducing noise while maintaining anomaly detection effectiveness", "alternatives_rejected": ["conservative-increase-interval-simple-deduplication (subsumed)", "moderate-severity-thresholds-persistent-state (deferred to Phase 2)", "foundation-agent-configuration-dashboard (deferred to Phase 4)"]}