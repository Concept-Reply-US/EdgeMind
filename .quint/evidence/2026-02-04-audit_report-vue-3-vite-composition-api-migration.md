---
target: vue-3-vite-composition-api-migration
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-05-05
date: 2026-02-04
id: 2026-02-04-audit_report-vue-3-vite-composition-api-migration.md
type: audit_report
content_hash: d1f497f234ca676ce783a7803d5af50b
---

WEAKEST LINK ANALYSIS:
- R_eff computed: 1.00 (all gates passed). Evidence is external research only (CL2) — no internal prototype was built. True confidence should be discounted ~10% for lack of internal validation.
- Adjusted practical R_eff: ~0.90

RISK FACTORS:
1. BIG-BANG vs INCREMENTAL (LOW): Vue uniquely supports incremental migration — Options API and Composition API coexist. However, migrating FROM vanilla JS (not from Vue 2) still requires converting HTML + JS to SFC format, which is effectively a rewrite per component. The 'incremental' advantage is theoretical unless a Web Components bridge is used. Practical risk: LOW-MEDIUM.
2. REAL-TIME PERFORMANCE (LOW): Vue's fine-grained reactivity (reactive/ref) updates only what changed — no virtual DOM diffing. For WebSocket data, this is inherently more efficient than React. No manual memoization patterns needed. The reactive() system handles granular updates automatically.
3. STATE MIGRATION COMPLEXITY (LOW): Direct 1:1 mapping confirmed by evidence:
   - state.js export const state = {} → Pinia defineStore() or reactive({})
   - connection object → composable useWebSocket()
   - personaState → Vue Router + Pinia
   - 78 window globals → provide/inject or Pinia stores
   This is the most natural migration of any framework option.
4. CI/CD IMPACT (LOW): Add 'npm run build' (Vite) to GitHub Actions before S3 sync. Vite builds are ~2-4 seconds (faster than React's Vite build due to smaller framework overhead).
5. CHART.JS INTEGRATION (LOW): vue-chartjs at 585K downloads/week, v5.3.3 supporting Chart.js v4. Mature and well-maintained. Not as large as React's wrapper but more than sufficient.
6. COMMUNITY SIZE (MEDIUM): Vue's community is smaller than React's. Fewer Stack Overflow answers, fewer tutorials, smaller hiring pool. For a solo developer (Stefan + AI agents), this is less of a concern than for a team-based project. AI agents can generate Vue code effectively.
7. HIDDEN COST ELIMINATED (ADVANTAGE): EdgeMind has ZERO frontend tests (Jest tests are backend-only in lib/__tests__/). The biggest hidden migration cost (Storyblok: 3+ weeks for test migration) does not apply.

BIAS CHECK:
- Pet Idea bias: Vue is emerging as the 'obvious winner' in this analysis. Risk of confirmation bias — am I selectively presenting evidence that favors Vue? Cross-check: The bundle size data, the Composition API mapping evidence, and the reactivity advantage are all from independent sources (LogRocket, Vue.js official docs, Monterail case study). The evidence genuinely favors Vue for THIS specific project.
- Not Invented Here: No NIH bias — Vue is a third-party framework like the others.
- Anchoring: The 2.5-3.5 week estimate is based on the module-to-SFC mapping analysis, not external benchmarks. Could be optimistic if unforeseen integration issues arise with WebSocket or Chart.js. Add 1-week buffer → 3.5-4.5 weeks realistic.

OVERALL RISK PROFILE: Low-Medium. Strongest natural mapping to existing code, best real-time performance characteristics, smallest bundle. Primary risk is smaller community, mitigated by AI-assisted development.