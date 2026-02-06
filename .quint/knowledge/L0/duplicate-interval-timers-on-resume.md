---
scope: lib/ai/index.js lines 1586-1622 (pause), 1681-1702 (resume)
kind: system
content_hash: 799320fd8fd0a68f6cc798ab2a50dd4c
---

# Hypothesis: Duplicate Interval Timers on Resume

In resumeAgenticLoop() (lib/ai/index.js lines 1693-1699), new intervals are created without null-checking existing ones. If called twice without stopping, duplicate intervals run simultaneously causing double memory usage and analysis runs. Fix: Add guard to clear existing intervals before creating new ones.

## Rationale
{"anomaly": "Calling resumeAgenticLoop() twice creates duplicate intervals", "approach": "Add null check and clearInterval before creating new intervals", "alternatives_rejected": ["Singleton pattern (over-engineering)", "State machine (adds complexity)"]}