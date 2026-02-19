---
id: vue-bun-full-rewrite
type: hypothesis
created: 2026-02-19
problem: Migrate EdgeMind from vanilla JS/Node.js to Vue 3/Bun
status: L0
formality: 3
novelty: Radical
complexity: High
author: Claude (generated), Human (to review)
scope:
  applies_to: "Full rewrite — Vue 3 frontend + Bun backend with Elysia/Hono replacing Express"
  not_valid_for: "Incremental migration strategies"
  scale: "~24,600 LOC rewritten. New backend framework. New frontend framework."
---

# Hypothesis: Full Rewrite — Vue 3 + Bun-Native Backend (Elysia/Hono replaces Express)

## 1. The Method (Design-Time)

### Proposed Approach
Don't just swap the runtime — go Bun-native on the backend too. Replace Express with a Bun-optimized framework like Elysia or Hono, replace the `ws` WebSocket library with Bun's built-in WebSocket server, and rewrite the backend in TypeScript. The frontend gets the full Vue 3 migration. The result is a fully TypeScript, fully Bun-native stack with no Node.js legacy. Use Bun's built-in test runner instead of Jest.

### Rationale
If you're going to touch everything anyway (Vue migration), why carry Express (a Node.js-era framework) into a Bun world? Elysia is purpose-built for Bun with end-to-end type safety and ~18x faster than Express. Bun has built-in WebSocket support that's faster than the `ws` library. This gives you the maximum performance benefit and the cleanest codebase. You're already rewriting the frontend — might as well make the backend best-in-class too.

### Implementation Steps
1. Set up Bun + Elysia (or Hono) backend scaffold
2. Port all REST API endpoints from Express to Elysia
3. Port WebSocket handling to Bun's native WebSocket
4. Port MQTT handling (mqtt.js stays — no Bun-native MQTT client)
5. Port InfluxDB, AWS SDK, ChromaDB integrations (library code stays, HTTP framework changes)
6. Convert all lib/ modules to TypeScript
7. Replace Jest with bun:test
8. Execute Vue 3 frontend migration per existing plan
9. Update Dockerfile, CI/CD, ECS task definitions
10. Full integration test

### Expected Capability
- ~18x faster HTTP handling (Elysia vs Express)
- Native TypeScript everywhere (no tsc needed)
- Built-in WebSocket (no ws dependency)
- End-to-end type safety with Elysia's Eden treaty
- Smaller dependency tree
- Maximum Bun performance benefits

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Very Low | Full rewrite of both frontend AND backend framework |
| **Explanatory Power** | High | Maximum modernization — best-in-class everything |
| **Consistency** | Low | Elysia/Hono untested with MQTT, AWS SDK patterns |
| **Falsifiability** | High | Integration tests will immediately show if it works |

**Plausibility Verdict:** MARGINAL (high reward but extreme scope risk)

### Assumptions to Verify
- [ ] A1: Elysia/Hono can handle the same middleware patterns as Express (CORS, body parsing, error handling)
- [ ] A2: Bun's native WebSocket can handle the same broadcast patterns (throttled MQTT → client)
- [ ] A3: All 25 REST endpoints can be ported without behavioral changes
- [ ] A4: mqtt.js works under Bun (same as other hypotheses)
- [ ] A5: AWS SDK works under Bun (same as other hypotheses)
- [ ] A6: bun:test can replace Jest for 407 tests
- [ ] A7: The combined rewrite (frontend + backend framework + backend runtime) can be done in <8 weeks
- [ ] A8: Elysia/Hono are stable enough for production (not just benchmarks)

### Required Evidence
- [ ] **Research:** Elysia vs Hono production readiness, community adoption, stability
  - **Performer:** AI Agent
- [ ] **Internal Test:** Port 3 representative endpoints to Elysia and benchmark
  - **Performer:** Developer
- [ ] **Research:** Bun native WebSocket API for broadcast patterns
  - **Performer:** AI Agent

## Falsification Criteria
- If Elysia/Hono doesn't support a middleware pattern needed by EdgeMind (e.g., SSE for agent chat)
- If total effort exceeds 8 weeks (too long for one person)
- If Bun's WebSocket doesn't support the same connection lifecycle as `ws`
- If the combined risk of two framework changes + one runtime change creates unmanageable debugging complexity

## Estimated Effort
7-9 weeks (3.5-4.5 weeks Vue + 3-4 weeks backend rewrite + integration)

## Weakest Link
Scope. This is a full rewrite of both frontend AND backend. For a solo developer with a conference timeline, this is extremely ambitious. The Express → Elysia port alone touches every endpoint, every middleware, and every WebSocket handler. Combined with the Vue migration, this is essentially rebuilding the entire application.
