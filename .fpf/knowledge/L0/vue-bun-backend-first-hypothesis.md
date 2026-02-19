---
id: vue-bun-backend-first
type: hypothesis
created: 2026-02-19
problem: Migrate EdgeMind from vanilla JS/Node.js to Vue 3/Bun
status: L0
formality: 3
novelty: Minimal
complexity: Low
author: Claude (generated), Human (to review)
scope:
  applies_to: "Bun backend runtime swap first, Vue 3 frontend after"
  not_valid_for: "Simultaneous migration"
  scale: "Backend: ~14,100 LOC (server.js + lib/). Frontend deferred."
---

# Hypothesis: Bun Backend First — Swap Runtime, Then Migrate Frontend

## 1. The Method (Design-Time)

### Proposed Approach
Swap the backend runtime from Node.js to Bun FIRST as an isolated change. The existing vanilla JS frontend stays untouched. Once the backend is verified on Bun (MQTT, WebSocket, InfluxDB, AWS SDK, tests all passing), THEN start the Vue 3 frontend migration. This sequences the two changes so each can be validated independently.

### Rationale
The Bun runtime swap is the higher-risk, lower-effort change. If Bun can't handle the AWS SDK or mqtt.js, you want to know that FAST — before spending 4 weeks on a Vue migration. By testing Bun compatibility first (a few hours of work), you either confirm Bun works and proceed with confidence, or discover blockers early and fall back to Node.js without wasted Vue migration effort. The Vue migration plan already assumes the backend is untouched, so the order doesn't matter functionally — but it matters strategically.

### Implementation Steps
1. Test Bun locally: `bun server.js` — verify MQTT, WebSocket, InfluxDB connect
2. Run test suite: `bun test` or `bunx jest` — verify 407 tests pass
3. Test AWS SDK: verify Bedrock calls, SSM parameter reads work
4. Update Dockerfile: `FROM oven/bun:latest` instead of `FROM node:18`
5. Deploy to dev environment and soak test for 24h
6. Deploy to production
7. THEN start Vue 3 migration per existing 9-phase plan
8. Vue migration uses Bun natively (bun install, bun run dev, bun run build)

### Expected Capability
- Backend runs on Bun with faster cold starts (~4x)
- All existing features work identically (runtime swap, not code change)
- Clear go/no-go signal for Bun before investing in Vue migration
- When Vue migration starts, Bun is already the established runtime
- Fastest way to learn if Bun is viable

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | High | Runtime swap is a single change — replace `node` with `bun` |
| **Explanatory Power** | Medium | Validates Bun feasibility before committing to full migration |
| **Consistency** | Medium | Bun compatibility with AWS SDK is unverified |
| **Falsifiability** | High | `bun server.js` either runs the app correctly or it doesn't |

**Plausibility Verdict:** PLAUSIBLE

### Assumptions to Verify
- [ ] A1: Bun can run Express + WebSocket server
- [ ] A2: mqtt.js TCP connections work under Bun
- [ ] A3: @aws-sdk/* credential chain and Bedrock calls work
- [ ] A4: @influxdata/influxdb-client works under Bun
- [ ] A5: sparkplug-payload protobuf decoding works
- [ ] A6: Jest tests pass under Bun (or bun:test is viable)
- [ ] A7: oven/bun Docker image runs on ECS Fargate

### Required Evidence
- [ ] **Internal Test:** Run `bun server.js` and verify core functionality (30 min)
  - **Performer:** Developer
- [ ] **Internal Test:** Run test suite under Bun
  - **Performer:** Developer
- [ ] **Research:** Known Bun issues with AWS SDK v3
  - **Performer:** AI Agent

## Falsification Criteria
- If any critical dependency (mqtt.js, AWS SDK, InfluxDB client) fails under Bun
- If >10% of tests fail due to Bun runtime differences
- If Bun Docker image doesn't run on Fargate (architecture mismatch)

## Estimated Effort
Phase 1 (Bun swap): 1-2 days
Phase 2 (Vue migration): 3.5-4.5 weeks
Total: ~4-5 weeks

## Weakest Link
Same as H1: AWS SDK v3 compatibility with Bun. But because this hypothesis tests Bun FIRST, you discover the blocker in hours instead of weeks.
