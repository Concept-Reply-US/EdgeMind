---
id: vue-bun-full-migration
type: hypothesis
created: 2026-02-19
problem: Migrate EdgeMind from vanilla JS/Node.js to Vue 3/Bun
status: L0
formality: 3
novelty: Novel
complexity: High
author: Claude (generated), Human (to review)
scope:
  applies_to: "Full stack migration — Vue 3 frontend + Bun backend runtime"
  not_valid_for: "Projects where backend has native Node.js C++ addons"
  scale: "~24,600 LOC JS, 22 CSS files, 25 lib modules, 930-line index.html"
---

# Hypothesis: Full Stack Migration — Vue 3 Frontend + Bun Backend Runtime

## 1. The Method (Design-Time)

### Proposed Approach
Execute the existing Vue 3 migration plan (docs/vue-migration-todo.md, 9 phases) for the frontend AND simultaneously migrate the backend runtime from Node.js to Bun. Bun replaces Node.js as the JavaScript/TypeScript runtime — same code, different engine. The backend (server.js, lib/) runs on Bun instead of Node.js, gaining faster startup, native TypeScript support, and a built-in bundler. Frontend uses Vite + Vue 3 as already planned. Both migrations happen in the same effort window.

### Rationale
Bun is a drop-in Node.js replacement for most workloads. The backend uses Express, WebSocket (ws), mqtt.js, and @influxdata/influxdb-client — all of which Bun supports. Migrating both layers at once avoids two separate migration efforts and lets you ship a fully modernized stack. Bun's faster cold start (up to 4x) benefits the ECS Fargate deployment (faster task startup). Native TypeScript means lib/ modules can optionally be converted to .ts without a build step.

### Implementation Steps
1. Test Bun compatibility: run `bun install` and `bun server.js` against the current codebase
2. Verify all npm dependencies work under Bun (mqtt.js, ws, @influxdata/influxdb-client, @aws-sdk/*, chromadb, sparkplug-payload)
3. Replace `npm` commands with `bun` equivalents in Dockerfile and CI/CD
4. Execute Vue 3 migration per existing 9-phase plan (docs/vue-migration-todo.md)
5. Update `package.json` scripts to use Bun
6. Update ECS Fargate task definition to use Bun-based Docker image (oven/bun)
7. Update GitHub Actions workflows for Bun
8. Run full test suite under Bun (Jest → bun:test or keep Jest with Bun runtime)

### Expected Capability
- Vue 3 SFC frontend with Pinia, Vue Router, vue-chartjs (same as standalone Vue migration)
- ~4x faster backend cold start on Fargate
- Native TypeScript support on backend (optional gradual migration)
- Faster `bun install` (~25x faster than npm install)
- Single modernized stack — no legacy vanilla JS or Node.js

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Low | Two migrations in one: frontend framework + backend runtime |
| **Explanatory Power** | High | Fully modernizes the stack, addresses both frontend complexity and runtime performance |
| **Consistency** | Medium | Vue 3 is L2 verified (DRR exists), but Bun compatibility with all deps is unverified |
| **Falsifiability** | High | `bun server.js` either works or it doesn't. Each dep either runs on Bun or fails. |

**Plausibility Verdict:** PLAUSIBLE (but high scope risk)

### Assumptions to Verify
- [ ] A1: Bun can run the Express server with WebSocket (ws) connections
- [ ] A2: mqtt.js works under Bun (TCP socket handling, reconnect logic)
- [ ] A3: @influxdata/influxdb-client works under Bun (HTTP client, write API)
- [ ] A4: @aws-sdk/* works under Bun (Bedrock, SSM, credential chain)
- [ ] A5: sparkplug-payload works under Bun (protobuf decoding)
- [ ] A6: chromadb client works under Bun
- [ ] A7: Jest tests run under Bun (or bun:test is a viable alternative)
- [ ] A8: Bun Docker image (oven/bun) works on ECS Fargate (ARM64 or AMD64)
- [ ] A9: Combined migration can be completed within acceptable timeline (~5-6 weeks total)

### Required Evidence
- [ ] **Internal Test:** Run `bun server.js` locally and verify MQTT, WebSocket, InfluxDB, Bedrock all connect
  - **Performer:** Developer
- [ ] **Research:** Bun compatibility with AWS SDK v3 (known issues, workarounds)
  - **Performer:** AI Agent
- [ ] **Research:** Bun Docker images for ECS Fargate (oven/bun:latest size, platform support)
  - **Performer:** AI Agent
- [ ] **Internal Test:** Run Jest test suite (407 tests) under Bun
  - **Performer:** Developer

## Falsification Criteria
- If mqtt.js TCP connections fail under Bun (MQTT is critical infrastructure)
- If @aws-sdk/client-bedrock-runtime doesn't work under Bun (AI analysis is core feature)
- If combined scope pushes timeline beyond 6 weeks (conference deadline pressure)
- If Bun Docker image adds >50% size to current Node.js image

## Estimated Effort
5-6 weeks (3.5-4.5 weeks Vue migration + 1-1.5 weeks Bun migration + overlap)

## Weakest Link
AWS SDK v3 compatibility with Bun. The AWS SDK has complex credential chain resolution, HTTP client internals, and streaming response handling. If any of these break under Bun, the entire backend migration fails.
