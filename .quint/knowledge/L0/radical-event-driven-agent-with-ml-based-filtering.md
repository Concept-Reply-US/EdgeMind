---
kind: system
scope: EdgeMind backend (lib/ai/, lib/influx/), requires ChromaDB integration (already deployed), event-driven architecture shift
content_hash: e6729e403f32ff0c549c86f9228a58dc
---

# Hypothesis: Radical: Event-Driven Agent with ML-Based Filtering

**Method:**
1. **Kill the Interval:** Replace 30s polling with event-driven triggers:
   - Agent only fires when factory state changes significantly
   - Use MQTT message pattern detection (e.g., value delta > threshold)
   - Set up EventEmitter in lib/ai/ that listens to factoryState changes
2. **ML Anomaly Classifier:**
   - Use Claude to build anomaly embeddings (vector representation)
   - Store embeddings in ChromaDB (already in stack for COO agent Q&A)
   - Query similar anomalies before creating work order
   - If cosine similarity > 0.85 to recent anomaly: suppress
3. **Feedback Loop:**
   - Track work order resolution status from CMMS
   - If work order marked "duplicate" or "false positive": train suppression
   - Build confidence scores for anomaly types over time
4. **Zero Polling:**
   - Agent becomes reactive instead of proactive
   - Only runs when actual anomalies detected by MQTT stream
   - Drastically reduces unnecessary LLM calls

**Implementation:**
- Refactor lib/ai/index.js: remove setInterval, add event listeners
- Integrate with existing ChromaDB container
- Add embedding generation + similarity search
- CMMS feedback webhook handler
- ~600 lines of code, paradigm shift from polling to events

## Rationale
{"anomaly": "Polling every 30s wastes LLM calls when factory is stable, creates false positives, no learning from past mistakes", "approach": "Event-driven reactive system with ML-based deduplication and feedback loop from CMMS resolution data", "alternatives_rejected": ["Keep polling (wasteful)", "Rule-based filtering (brittle, no learning)", "External ML service (latency, cost)", "Replace Claude with simpler model (loses reasoning capability)"]}