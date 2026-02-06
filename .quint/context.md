# Bounded Context

## Vocabulary

Memory leak, unbounded growth, TTL (Time-To-Live), cache eviction, circular buffer, event listener, interval timer, WebSocket backpressure, MQTT message accumulation, garbage collection, heap memory, shift() O(n) complexity

## Invariants

1. All in-memory caches MUST have bounded size or TTL-based eviction.
2. Array trimming operations SHOULD be O(1) not O(n).
3. Interval timers MUST be cleared before creating new ones.
4. Duplicate code paths writing to same state MUST be consolidated.
5. Long-running loops MUST not accumulate unbounded data structures.
