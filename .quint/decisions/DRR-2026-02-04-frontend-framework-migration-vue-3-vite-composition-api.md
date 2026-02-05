---
type: DRR
winner_id: vue-3-vite-composition-api-migration
created: 2026-02-04T13:48:58-05:00
content_hash: 529614b9aa29738d631cb8f66a6aec55
---

# Frontend Framework Migration: Vue 3 + Vite + Composition API

## Context
EdgeMind's vanilla ES modules frontend has grown to 11,373 LOC across 44 files (22 JS modules, 22 CSS files, index.html) with 311 DOM manipulation calls, 78 window globals, MutationObserver-based pseudo-routing, and no build system or component model. Adding new views/personas is increasingly fragile. Four alternatives were evaluated: React 19, Angular 19, Vue 3, and Lit Web Components. Angular was eliminated at validation (over-engineered for solo developer + conference demo). Lit was refined-out at verification (ecosystem gaps). React and Vue survived to L2 audit.

## Decision
**Selected Option:** vue-3-vite-composition-api-migration

We will migrate the EdgeMind frontend to Vue 3 with Vite build system, Composition API, Pinia state management, Vue Router, and vue-chartjs for Chart.js integration. The backend (server.js, lib/) remains untouched. The frontend will be rebuilt as Vue SFCs consuming the same REST and WebSocket APIs.

## Rationale
Vue 3 Composition API won because: (1) 1:1 structural mapping — existing vanilla ES modules with init/cleanup lifecycle map directly to Composition API setup/onMounted/onUnmounted, and state.js objects map directly to Pinia stores, (2) Fine-grained reactivity handles real-time WebSocket data automatically without the manual useMemo/useCallback/React.memo optimization React requires, (3) Smallest production bundle at ~20KB gzipped (vs React's 45KB), (4) SFC format naturally bundles each component's JS + CSS together, matching the existing 1:1 JS/CSS file pairing, (5) Lowest estimated LOE at 3.5-4.5 weeks realistic (vs React's 4-5 weeks), (6) No frontend test migration cost (EdgeMind has zero frontend tests). React was rejected despite having the larger ecosystem because: its reconciliation model requires explicit optimization for real-time data, state migration is heavier (Context/Zustand vs direct Pinia mapping), and the 'safe default' popularity advantage doesn't outweigh Vue's natural fit for this specific codebase.

### Characteristic Space (C.16)
Migration friction: LOW. Real-time performance: HIGH (automatic reactivity). Bundle size: SMALLEST. Ecosystem: ADEQUATE. LOE: 3.5-4.5 weeks. Risk: LOW-MEDIUM.

## Consequences
IMMEDIATE: (1) Set up Vite + Vue 3 + TypeScript scaffold in a frontend/ directory alongside existing code, (2) Update CI/CD (GitHub Actions) to run npm run build before S3 sync, (3) Update Dockerfile if frontend is served from backend. MIGRATION PLAN: Convert 22 JS modules into ~30-40 Vue SFCs, replace MutationObserver with Vue Router, replace window globals with Pinia stores, wrap Chart.js with vue-chartjs. RISKS ACCEPTED: Smaller community than React (mitigated by AI-assisted development), big-bang rewrite per persona view (mitigated by converting one persona at a time). REVISIT WHEN: (1) Team grows beyond 3 developers (reassess React for hiring pool), (2) Vue Vapor Mode releases (may further reduce bundle size), (3) If real-time performance issues emerge despite Vue's reactivity model.
