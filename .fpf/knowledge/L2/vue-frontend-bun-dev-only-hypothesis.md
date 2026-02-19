---
id: vue-frontend-bun-dev-only
type: hypothesis
created: 2026-02-19
problem: Migrate EdgeMind from vanilla JS/Node.js to Vue 3/Bun
status: L2
decided_in: DRR-003
decision_date: 2026-02-19
deduction_passed: 2026-02-19
induction_passed: 2026-02-19
evidence:
  - ../evidence/2026-02-19-bun-vue-vite-compatibility.md
evidence_summary: |
  Verified through live testing on macOS. Bun 1.3.9 successfully:
  - Scaffolded Vue 3 + TypeScript project (bun create vite --template vue-ts)
  - Installed all deps in 943ms (vue, vue-router, pinia, vue-chartjs, chart.js)
  - Started Vite 7.3.1 dev server with proxy config in 949ms
  - Built production bundle (tsc + vite build) in 346ms
  - Generated text-based bun.lock (JSON, diffable) — not binary
  Note: bun create syntax differs slightly from npm create (no -- separator)
validity_conditions:
  - Bun 1.3.x on macOS/Linux
  - Vue 3 + Vite ecosystem dependencies
  - Re-verify on Bun 2.x or Vite 8.x
formality: 3
novelty: Conservative
complexity: Medium
author: Claude (generated), Human (to review)
scope:
  applies_to: "Vue 3 frontend migration + Bun as dev tooling only (not production runtime)"
  not_valid_for: "Backend runtime replacement"
  scale: "Frontend: ~10,500 LOC (22 JS + 22 CSS + index.html). Backend stays Node.js."
---

# Hypothesis: Vue 3 Frontend + Bun as Dev Tooling Only (Node.js stays in production)

## 1. The Method (Design-Time)

### Proposed Approach
Execute the Vue 3 migration per the existing plan (docs/vue-migration-todo.md) but use Bun only as the local development tool — `bun install`, `bun run dev`, `bun run build` — while keeping Node.js as the production backend runtime. This gets you the Bun DX benefits (faster installs, faster dev server) without the risk of Bun incompatibilities in production. The backend (server.js, lib/) continues running on Node.js in ECS Fargate. The frontend builds via Vite (which Bun runs natively) and deploys as static files to S3/CloudFront.

### Rationale
Bun's biggest wins are in developer experience: `bun install` is ~25x faster than `npm install`, and Bun runs Vite's dev server faster than Node.js. But the production backend has complex dependencies (AWS SDK, MQTT, InfluxDB, ChromaDB) that are well-tested on Node.js and untested on Bun. By using Bun only for development tooling and the frontend build pipeline, you get speed benefits where they matter most (local iteration) without risking production stability. This is the safest path that still involves Bun.

### Implementation Steps
1. Install Bun locally: `curl -fsSL https://bun.sh/install | bash`
2. Execute Vue 3 migration per 9-phase plan
3. Use `bun install` instead of `npm install` for frontend dependencies
4. Use `bun run dev` for Vite dev server
5. Use `bun run build` for production builds (outputs same static files)
6. Backend remains `node server.js` in Dockerfile and production
7. CI/CD: frontend build step uses Bun, backend stays on Node.js
8. `bun.lockb` replaces `package-lock.json` for frontend dependencies

### Expected Capability
- Vue 3 SFC frontend (identical to standalone Vue migration)
- ~25x faster dependency installs during development
- Faster Vite dev server startup
- Zero production risk — backend is still Node.js
- Gradual path to full Bun adoption later (if desired)

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | High | Bun is just a local tool, not a production runtime change |
| **Explanatory Power** | Medium | Modernizes frontend fully but backend stays on Node.js |
| **Consistency** | High | Vue 3 is L2 verified, Bun as dev tool is well-documented |
| **Falsifiability** | High | Vite builds work under Bun or they don't |

**Plausibility Verdict:** PLAUSIBLE (strong)

### Assumptions to Verify
- [ ] A1: Bun runs Vite dev server correctly (HMR, proxy to backend)
- [ ] A2: `bun install` resolves all Vue/Vite/Pinia dependencies
- [ ] A3: `bun run build` produces identical output to `npm run build`
- [ ] A4: bun.lockb can coexist with package-lock.json (if backend still uses npm)

### Required Evidence
- [ ] **Internal Test:** Run `bun create vite frontend --template vue-ts` and verify dev server
  - **Performer:** Developer
- [ ] **Internal Test:** Build production bundle with `bun run build` and compare output
  - **Performer:** Developer

## Falsification Criteria
- If Bun can't run Vite dev server reliably (HMR breaks, proxy doesn't work)
- If `bun run build` produces different output than `npm run build` (shouldn't, but verify)
- If managing two lockfiles (bun.lockb for frontend, package-lock.json for backend) causes CI confusion

## Estimated Effort
3.5-4.5 weeks (same as Vue-only migration — Bun swap is <1 hour of setup)

## Weakest Link
Two package managers in one repo (Bun for frontend, npm for backend). Could cause confusion in CI/CD if not clearly documented. Mitigated by keeping frontend in a separate `frontend/` directory with its own package.json.
