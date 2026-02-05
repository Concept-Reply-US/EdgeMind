---
scope: EdgeMind frontend only. Backend unchanged. CI/CD needs vite build step. Smallest bundle size of the three frameworks.
kind: system
content_hash: cadc8c58b0b5fc92c9cefc9216b32a82
---

# Hypothesis: Vue 3 (Vite + Composition API) Migration

Migrate the EdgeMind frontend to Vue 3 with Vite and Composition API. Strategy: (1) Vite scaffolds Vue project (vue-ts template), (2) Convert 22 JS modules into Vue SFCs (Single File Components) - each .vue file bundles template + script + scoped CSS, (3) Replace MutationObserver routing with Vue Router, (4) Replace DOM manipulation with Vue's reactive template syntax (v-if, v-for, v-bind), (5) Replace 78 window globals with Pinia stores (2-3 stores mapping to current state objects), (6) WebSocket as a composable (useWebSocket) with reactive refs, (7) Chart.js via vue-chartjs wrapper, (8) Scoped CSS built into SFC format - existing 22 CSS files naturally map to component-scoped styles, (9) Backend unchanged.

Estimated component breakdown: ~30-40 Vue SFCs. Vue's SFC format is the closest conceptual match to the current architecture (each JS module becomes a .vue file with its corresponding CSS). Composition API's setup() pattern maps almost 1:1 to the existing module export pattern. Pinia stores map directly to current state.js objects.

LOE estimate: 2.5-3.5 weeks for a single developer. Lowest migration friction because Vue's mental model (reactive state + templates) maps closest to the existing vanilla pattern. Gentlest learning curve. Smaller community than React but strong ecosystem.

## Rationale
{"anomaly": "11,373 LOC vanilla frontend with no component model, 311 DOM manipulation calls, 78 window globals, MutationObserver routing", "approach": "Full migration to Vue 3 + Vite + Composition API + Pinia. Closest mental model to existing vanilla code. SFCs naturally bundle JS+CSS per component. Composition API maps 1:1 to current module exports. Lowest migration friction.", "alternatives_rejected": ["Vue Options API (Composition API is more flexible and maps better to existing code)", "Nuxt (SSR not needed for this dashboard)"]}