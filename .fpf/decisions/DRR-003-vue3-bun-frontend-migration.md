---
id: DRR-003
title: "Vue 3 Frontend Migration with Bun Dev Tooling"
status: ACCEPTED
date: 2026-02-19
decision_makers:
  - "Stefan Bekker — Project Owner"
  - "Claude — Analyst/Advisor"
supersedes: none
hypothesis_selected: "vue-frontend-bun-dev-only"
alternatives_rejected: ["vue-bun-full-migration", "vue-bun-backend-first", "vue-bun-full-rewrite"]
---

# DRR-003: Vue 3 Frontend Migration with Bun Dev Tooling

## Executive Summary

**Decision:** Migrate the EdgeMind frontend from vanilla JS/CSS (22 JS modules, 22 CSS files, 930-line index.html) to Vue 3 SFC architecture using the existing 9-phase migration plan, with Bun as the development toolchain. The backend (server.js, lib/) remains on Node.js untouched.

**Based on:** H2 (vue-frontend-bun-dev-only) at L2 with R_eff = 1.00

**Key evidence:** Internal test confirmed Bun 1.3.9 runs Vite 7.3.1 dev server (949ms startup), installs all Vue deps (943ms), and builds production bundles (346ms) without issues.

## Context

### Problem Statement
EdgeMind's vanilla JS frontend has grown to ~10,500 LOC across 44 files with 311 DOM manipulation calls, 78 window globals, MutationObserver-based pseudo-routing, and no component model. Adding new views or modifying existing ones is increasingly fragile. The frontend is the biggest maintenance headache.

### Trigger
Post-conference (ProveIt! 2026, Feb 16-20) window to modernize the frontend without deadline pressure. The backend is stable and working well.

### Constraints
- Solo developer + AI agents
- Backend REST + WebSocket API contracts are frozen (no backend changes)
- Production deployment: S3/CloudFront for frontend, ECS Fargate for backend (ADR-006)
- Existing CI/CD: GitHub Actions with separate frontend/backend workflows

### Success Criteria
- All 3 persona views (COO, Plant Manager, Demo) render correctly with live data
- WebSocket real-time updates work through Vue reactivity
- All Chart.js visualizations work via vue-chartjs
- Feature parity with vanilla frontend (visual side-by-side comparison)
- Backend tests still pass (407 tests, untouched)
- Production deploy works via updated CI/CD

## Decision

**We will:**
- Execute the 9-phase Vue 3 migration per `docs/vue-migration-todo.md`
- Use Bun as the local development toolchain (`bun install`, `bun run dev`, `bun run build`)
- Use Bun in CI/CD for the frontend build step (`oven-sh/setup-bun@v2`)
- Keep the frontend in `frontend/` directory with its own `package.json` and `bun.lock`
- Deploy built Vue app (frontend/dist/) to S3/CloudFront

**We will NOT:**
- Touch the backend (server.js, lib/) — it stays on Node.js
- Replace Express, WebSocket (ws), or any backend dependency
- Use Bun as the production runtime
- Adopt UI component libraries (Vuetify, PrimeVue)
- Add SSR/Nuxt — this is an SPA dashboard

**Based on hypothesis:** `.fpf/knowledge/L2/vue-frontend-bun-dev-only-hypothesis.md`

## Alternatives Considered

### H1: Full Stack Migration (Vue 3 + Bun Runtime)
- **Status:** L0 (dropped by human)
- **Summary:** Migrate frontend to Vue 3 AND swap backend runtime to Bun simultaneously
- **Why rejected:** "The biggest headache is in the frontend." Backend is working fine. Adding backend runtime risk to the frontend migration adds scope without addressing the pain point.

### H3: Bun Backend First, Then Vue
- **Status:** L0 (dropped by human)
- **Summary:** Swap backend to Bun first as a compatibility test, then do Vue migration
- **Why rejected:** Solves the wrong problem first. The frontend is the headache, not the backend runtime.

### H4: Full Rewrite (Vue 3 + Elysia/Hono)
- **Status:** L0 (dropped by human)
- **Summary:** Replace everything — Vue frontend, Elysia backend, bun:test
- **Why rejected:** 7-9 week scope for solo developer. Adds backend framework rewrite on top of already-significant frontend migration. Extreme scope risk.

## Evidence Summary

### Supporting Evidence

| Claim | Evidence | Type | R_eff |
|-------|----------|------|-------|
| Bun runs Vite dev server with proxy | `evidence/2026-02-19-bun-vue-vite-compatibility.md` | internal | 1.00 |
| Bun installs Vue/Pinia/vue-chartjs | `evidence/2026-02-19-bun-vue-vite-compatibility.md` | internal | 1.00 |
| Bun produces correct production builds | `evidence/2026-02-19-bun-vue-vite-compatibility.md` | internal | 1.00 |
| Vue 3 is the right framework for this codebase | `.quint/decisions/DRR-2026-02-04-frontend-framework-migration-vue-3-vite-composition-api.md` | prior decision | 1.00 |

### WLNK Calculation

```
R_eff(internal test) = 1.00 (direct, no congruence penalty)
R_eff(prior DRR)     = 1.00 (same project, same decision context)

Overall R_eff = min(1.00, 1.00) = 1.00
```

No weakest link — all evidence is internal/direct.

### Evidence Gaps

- CSS scoping regressions not empirically tested (mitigated by Phase 7 visual comparison)
- 3.5-4.5 week estimate not validated against actual velocity (mitigated by tracking Phase 0-1)
- WebSocket proxy not tested end-to-end with live backend (mitigated by Vite's well-documented proxy support)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| CSS scoping breaks visual layout | Medium | Medium | Visual side-by-side comparison per component (Phase 7) | Stefan |
| Migration takes >6 weeks | Low | Low | No deadline pressure. Track Phase 0-1 velocity to calibrate. | Stefan |
| Solo developer fatigue mid-migration | Medium | Medium | Phases are independently deliverable. Can pause between phases. | Stefan |
| Bun syntax gotchas | Low | Very Low | Fallback to npm in 5 minutes. Document gotchas. | Stefan |

## Validity Conditions

This decision remains valid **WHILE:**
- The backend REST + WebSocket API contracts don't change
- Vue 3 remains the selected frontend framework (per DRR 2026-02-04)
- The project is a solo developer effort
- No new conference deadline creates pressure

**Re-evaluate IF:**
- Vue 4.0 is announced
- Bun 2.0 introduces breaking changes with Vite
- Team grows beyond 2 developers (reassess tooling choices for team)
- A deadline materializes that conflicts with migration timeline

## Implementation Notes

### Immediate Actions
1. The `frontend/` scaffold with Vue 3 + Vite + Bun already exists (created during testing)
2. Start with Phase 0 (complete remaining scaffold tasks) and Phase 1 (state + WebSocket + API)
3. Update `.fpf/context.md` to reflect new tech stack (Vue 3, Vite, Bun, Pinia)

### Follow-up Items
- [ ] Update `docs/vue-migration-todo.md` with Bun-specific notes (scaffold syntax, bun.lock format)
- [ ] Update `deploy-frontend.yml` to add Bun build step before S3 sync
- [ ] Remove frontend files from Dockerfile (index.html, css/, js/) once Vue migration is complete
- [ ] Update CLAUDE.md frontend section after migration
- [ ] Update `docs/project_notes/decisions.md` with this ADR

### Migration Plan Reference
See `docs/vue-migration-todo.md` for the complete 9-phase plan with file mappings.

## Consequences

### Expected Positive Outcomes
- Reactive component model eliminates 311 DOM manipulation calls
- Vue Router replaces MutationObserver pseudo-routing
- Pinia stores replace 78 window globals
- Scoped CSS eliminates cascade-order bugs
- TypeScript adds type safety to frontend code
- vue-chartjs wraps Chart.js with proper lifecycle management
- Faster dev iteration with Bun + Vite HMR

### Accepted Trade-offs
- 3.5-4.5 weeks of migration effort with no new user-facing features
- Two package managers in repo (Bun for frontend, npm for backend) — mitigated by directory isolation
- Learning curve for Vue 3 Composition API patterns

### Potential Negative Outcomes (Accepted Risks)
- CSS scoping regressions — Accepted because visual testing will catch them
- Migration fatigue — Accepted because no deadline pressure exists

## Audit Trail

### Reasoning Cycle
- **Problem defined:** 2026-02-19
- **Hypotheses generated:** 4 on 2026-02-19
- **Human filtered to:** 1 (H2) based on "frontend is the headache"
- **Deduction completed:** 2026-02-19 — 1 passed (H2)
- **Induction completed:** 2026-02-19 — 1 evidence file, 3 assumptions verified
- **Audit completed:** 2026-02-19 — 0 blockers, 2 warnings, R_eff=1.00
- **Decision finalized:** 2026-02-19

### Key Decisions During Cycle
- Human directed focus to frontend (dropped H1, H3, H4)
- Deduction eliminated A4 assumption as non-issue (separate directories)
- Testing revealed bun.lock is JSON-based (not binary) in Bun 1.3+
- Audit identified CSS scoping as the primary execution risk

## References

- **Session archive:** `.fpf/sessions/2026-02-19-vue3-bun-frontend-migration.md`
- **Winning hypothesis:** `.fpf/knowledge/L2/vue-frontend-bun-dev-only-hypothesis.md`
- **Evidence:** `.fpf/evidence/2026-02-19-bun-vue-vite-compatibility.md`
- **Prior Vue 3 DRR:** `.quint/decisions/DRR-2026-02-04-frontend-framework-migration-vue-3-vite-composition-api.md`
- **Migration plan:** `docs/vue-migration-todo.md`
- **Related ADRs:** ADR-006 (S3/CloudFront deploy), ADR-014 (frontend modularization), ADR-015 (persona init/cleanup)
