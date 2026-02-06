---
scope: lib/ai/index.js processInsight() and runTrendAnalysis() functions
kind: system
content_hash: d1ab06f7c629908c08a45b0fab8374e7
---

# Hypothesis: Duplicate Code Paths for Insights/Anomalies

trendInsights and anomalies are pushed from BOTH processInsight() (lines 1424, 1444) AND runTrendAnalysis() (lines 1522, 1530). This causes potential duplicate writes and makes bounds checking unreliable. Fix: Consolidate to single code path through processInsight() only.

## Rationale
{"anomaly": "Multiple code paths write to same arrays causing duplicate entries", "approach": "Route all insight/anomaly storage through processInsight()", "alternatives_rejected": ["Event emitter pattern (adds complexity)", "Separate arrays per source (defeats deduplication)"]}