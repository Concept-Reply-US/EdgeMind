---
scope: lib/demo/engine.js lines 73-86 (start), 239-244 (stop)
kind: system
content_hash: 26dd10be302b5087227472f413b9a130
---

# Hypothesis: Demo Engine Timer Race Condition

In ScenarioRunner.start() (lib/demo/engine.js lines 73-86), timers are pushed to this.timers array. If start() is called multiple times before stop() completes, timers from previous runs accumulate. Fix: Add guard to prevent start() while already running, or clear existing timers before adding new ones.

## Rationale
{"anomaly": "Rapid start/stop cycles can accumulate orphaned timers", "approach": "Add isRunning guard or clear timers at start of start()", "alternatives_rejected": ["Mutex/semaphore (overkill for JS single-thread)", "Promise-based locking (adds complexity)"]}