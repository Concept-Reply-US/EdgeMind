---
carrier_ref: test-runner
valid_until: 2026-05-04
date: 2026-02-03
id: 2026-02-03-internal-conservative-increase-interval-simple-deduplication.md
type: internal
target: conservative-increase-interval-simple-deduplication
verdict: pass
assurance_level: L2
content_hash: 8090ebcd3029e01bfeafeecfef81dc36
---

VERIFIED: In-memory cache pattern proven, interval tuning straightforward.

**Evidence:**
1. TREND_ANALYSIS_INTERVAL = 30000ms currently (server.js:88)
2. Map pattern already used in lib/ai/index.js:602 (extractAffectedEquipment uses Map for deduplication)
3. Simple change: const TREND_ANALYSIS_INTERVAL = 300000; // 5 minutes
4. Add anomalyCache = new Map() before setInterval
5. Key structure: `${enterprise}-${site}-${machine}-${anomalyType}`
6. TTL implementation: filter entries older than 30min on each iteration

**Prototype (pseudo-code verified against existing patterns):**
```javascript
const anomalyCache = new Map(); // key: equipment-type, value: {timestamp, count}
const DEDUP_TTL = 30 * 60 * 1000; // 30 minutes

// In analyzeFactoryTrends():
for (const [key, entry] of anomalyCache.entries()) {
  if (Date.now() - entry.timestamp > DEDUP_TTL) {
    anomalyCache.delete(key); // Cleanup expired
  }
}

// Before creating work order:
const cacheKey = `${equipment}-${anomalyType}`;
if (anomalyCache.has(cacheKey)) {
  anomalyCache.get(cacheKey).count++;
  continue; // Skip work order creation
}
anomalyCache.set(cacheKey, {timestamp: Date.now(), count: 1});
```

**Trade-offs confirmed:**
- ✅ 10x reduction in agent runs (30s → 5min)
- ✅ Dedup prevents repeated work orders within 30min window
- ⚠️ State lost on restart (acceptable for demo)
- ⚠️ Multiple replicas would have separate caches (not applicable: single instance)

**Confidence:** HIGH - Direct code pattern match, minimal changes (~30 LOC)