---
scope: lib/ai/index.js lines 1424-1427, 1444-1452, 1522-1538; server.js lines 459-462
kind: system
content_hash: a41764db2806bb104f7f26ac21c75f9e
---

# Hypothesis: Array Shift Operations O(n) Complexity

Multiple arrays use shift() in while loops for trimming: trendInsights (line 1426), anomalies (line 1451, 1537), messages (line 462). shift() is O(n) causing memory churn and GC pressure. Fix: Replace with circular buffer pattern or use slice() to create new bounded array.

## Rationale
{"anomaly": "O(n) shift operations cause memory churn at high message rates", "approach": "Replace shift() with slice() or circular buffer for O(1) trimming", "alternatives_rejected": ["Linked list (overkill)", "Third-party ring buffer (adds dependency)"]}