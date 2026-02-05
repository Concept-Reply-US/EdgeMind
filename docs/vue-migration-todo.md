# Vue 3 Migration TODO

**Decision:** ADR-017 (2026-02-04)
**DRR:** `.quint/decisions/DRR-2026-02-04-frontend-framework-migration-vue-3-vite-composition-api.md`
**Estimated LOE:** 3.5-4.5 weeks
**Rule:** Backend (server.js, lib/) is UNTOUCHED. Same REST + WebSocket APIs.

---

## Ground Rules (Read Before Every Task)

1. **No new complexity.** If a Vue pattern feels more complex than what it replaces, stop and simplify.
2. **No premature abstraction.** Don't create shared components until the same pattern appears 3+ times.
3. **No UI libraries.** No Vuetify, PrimeVue, or component libraries. Migrate the existing CSS as-is.
4. **No Tailwind.** Keep existing CSS. Scope it per component via Vue SFC `<style scoped>`.
5. **No SSR/Nuxt.** This is an SPA dashboard. Vite + Vue is the full stack.
6. **No over-typing.** Add TypeScript types where they help (props, stores, API responses). Don't type internal implementation details that TypeScript can infer.
7. **One component = one file.** No barrel exports, no index.ts re-exports, no component libraries.
8. **Test the API contract, not the framework.** Write tests for data fetching and state logic, not for Vue rendering details.
9. **Each phase must be fully working before starting the next.** No half-migrated states.
10. **Delete the old file when its replacement is working.** No zombie code.

---

## Phase 0: Project Scaffold

Set up the Vue 3 + Vite + TypeScript project alongside the existing frontend.

- [ ] **0.1** Initialize Vite project: `npm create vite@latest frontend -- --template vue-ts`
- [ ] **0.2** Install core dependencies: `vue-router`, `pinia`, `vue-chartjs`, `chart.js`
- [ ] **0.3** Configure Vite dev server proxy to backend (`localhost:3000`) for API and WebSocket
- [ ] **0.4** Configure path aliases (`@/` → `src/`)
- [ ] **0.5** Set up ESLint + Prettier for Vue (extend existing project config)
- [ ] **0.6** Create `App.vue` shell with `<RouterView />`
- [ ] **0.7** Create basic router with placeholder routes for all persona views
- [ ] **0.8** Verify dev server starts and proxies API calls to backend
- [ ] **0.9** Add `frontend/` to `.gitignore` for `node_modules` only (track source files)

**Deliverable:** Empty Vue app that loads and can proxy to the running backend.

---

## Phase 1: Foundation (State + WebSocket + API)

Migrate the shared infrastructure that all views depend on. Nothing renders yet — just plumbing.

### 1A: State → Pinia Stores

Current state lives in `js/state.js` as 5 exported mutable objects (102 LOC).

- [ ] **1A.1** Create `stores/app.ts` — main application state
  - Maps from: `state` object (messages, insights, anomalies, stats, OEE, topics, filters, thresholds)
  - Getters for computed values (filtered insights, anomaly counts)
  - Actions for state mutations (addMessage, addInsight, setFilter, etc.)
- [ ] **1A.2** Create `stores/connection.ts` — WebSocket connection state
  - Maps from: `connection` object (ws, isConnected, messageRate, chatSessionId)
- [ ] **1A.3** Create `stores/persona.ts` — persona/navigation state
  - Maps from: `personaState` + `personaDefaults` objects
  - Integrated with Vue Router (active persona = route)
- [ ] **1A.4** Create `stores/demo.ts` — demo control state
  - Maps from: `demoState` object (scenarios, profiles, activeScenario, timer)
- [ ] **1A.5** Delete `SLEEPING_AGENT_MESSAGES` from store — move to a constants file or keep inline

**Deliverable:** 4 Pinia stores with typed state matching current `js/state.js` exactly.

### 1B: WebSocket → Composable

Current WebSocket lives in `js/websocket.js` (267 LOC).

- [ ] **1B.1** Create `composables/useWebSocket.ts`
  - Auto-connect on app mount, reconnect on disconnect
  - Parse message types: `initial_state`, `mqtt_message`, `trend_insight`
  - Dispatch to appropriate Pinia store actions
  - Expose: `isConnected`, `send()`, `messageRate`
- [ ] **1B.2** Provide WebSocket composable at app level (App.vue `onMounted`)
- [ ] **1B.3** Verify WebSocket connects and receives messages (check browser devtools)

**Deliverable:** WebSocket auto-connects and populates Pinia stores with live data.

### 1C: API → Composable

Current API calls live in `js/dashboard-data.js` (472 LOC) — the largest JS module.

- [ ] **1C.1** Create `composables/useApi.ts` — typed fetch wrapper
  - Base URL detection (localhost vs production)
  - Error handling (toast or console, not alerts)
  - Return type: `{ data, error, loading }`
- [ ] **1C.2** Create `composables/useOEE.ts` — OEE-specific data fetching
  - Maps from: `fetchOEE`, `fetchOEEBreakdown`, `fetchFactoryStatus`, `fetchLineOEE`
  - Auto-refresh via `setInterval` (30s, matching current behavior)
  - Store results in Pinia app store
- [ ] **1C.3** Create `composables/useEquipment.ts` — equipment data
  - Maps from: `fetchEquipmentStates`
- [ ] **1C.4** Create `composables/useQuality.ts` — quality/waste data
  - Maps from: `fetchWasteTrends`, `fetchScrapByLine`, `fetchQualityMetrics`

**Deliverable:** All data fetching works via composables. Pinia stores populated on app load.

### 1D: CSS Foundation

Current CSS is 22 files (5,352 LOC). Most will become scoped per component. Foundation CSS stays global.

- [ ] **1D.1** Copy `css/variables.css` → `src/assets/variables.css` (global — loaded in `main.ts`)
- [ ] **1D.2** Copy `css/base.css` → `src/assets/base.css` (global — reset, body, grid backgrounds)
- [ ] **1D.3** Copy `css/animations.css` → `src/assets/animations.css` (global — @keyframes)
- [ ] **1D.4** Import all three in `main.ts` in order: variables → base → animations
- [ ] **1D.5** Verify CSS custom properties and animations work in Vue app

**Deliverable:** Global CSS loads correctly. Theme variables available to all components.

---

## Phase 2: App Shell + Navigation

Replace the MutationObserver pseudo-routing with Vue Router. Get persona switching working.

- [ ] **2.1** Create `components/CommandBar.vue` — top navigation bar
  - Maps from: `css/command-bar.css` (245 LOC) + persona chips in `index.html`
  - Persona switching via `router.push()` instead of class toggling
  - Sub-navigation for persona views
  - Scoped CSS from `css/command-bar.css`
- [ ] **2.2** Create `components/ConnectionStatus.vue` — connection indicator
  - Maps from: `css/connection.css` (72 LOC)
  - Reads from `connection` Pinia store
- [ ] **2.3** Create `components/Footer.vue`
  - Maps from: `css/footer.css` (54 LOC)
- [ ] **2.4** Update `App.vue` layout: CommandBar + RouterView + Footer
- [ ] **2.5** Configure Vue Router with nested routes:
  ```
  /coo                    → COO layout
    /coo/dashboard        → Main dashboard (default)
    /coo/enterprise       → Enterprise comparison
    /coo/trends           → Trend analysis
    /coo/agent            → Agent Q&A
  /plant                  → Plant Manager layout
    /plant/line-status    → Line status (default)
    /plant/oee-drilldown  → OEE drilldown
    /plant/equipment      → Equipment health
    /plant/alerts         → Alerts + work orders
  /demo                   → Demo layout
    /demo/scenarios       → Scenarios (default)
    /demo/inject          → Anomaly injection
    /demo/timer           → Timer + reset
  ```
- [ ] **2.6** Implement keyboard shortcuts for persona switching (matches current: 1/2/3)
- [ ] **2.7** Verify persona switching works via navbar and keyboard

**Deliverable:** App shell with working navigation between empty persona views. No MutationObserver.

---

## Phase 3: Shared Components

Components used across multiple persona views. Build these before the views that use them.

### 3A: Chart Components

Current charts live in `js/charts.js` (185 LOC) + `js/dashboard-render.js` (439 LOC partial).

- [ ] **3A.1** Create `components/charts/OEEGauge.vue` — OEE gauge visualization
  - Maps from: scorecard rendering in dashboard-render.js
  - Scoped CSS from `css/scorecard.css` (164 LOC)
- [ ] **3A.2** Create `components/charts/LineChart.vue` — generic line chart wrapper
  - Uses vue-chartjs `<Line />` component
  - Props: `data`, `options`, `title`
  - Scoped CSS from `css/charts.css` (193 LOC)
- [ ] **3A.3** Create `components/charts/BarChart.vue` — generic bar chart wrapper
  - Uses vue-chartjs `<Bar />` component
- [ ] **3A.4** Create `components/charts/DoughnutChart.vue` — for OEE breakdown
  - Uses vue-chartjs `<Doughnut />` component

**Deliverable:** Reusable chart components that accept data via props.

### 3B: Card Components

Cards are the primary layout unit. Used in every persona view.

- [ ] **3B.1** Create `components/ui/Card.vue` — base card with expand/maximize
  - Maps from: `css/cards.css` (176 LOC) + expand logic in `js/modals.js`
  - Props: `title`, `expandable`
  - Slot for content
- [ ] **3B.2** Create `components/ui/CardModal.vue` — expanded card overlay
  - Maps from: card-modal-overlay in modals.js

**Deliverable:** Card component with slot content and expand/maximize behavior.

### 3C: Modal Components

Current modals live in `js/modals.js` (343 LOC).

- [ ] **3C.1** Create `components/ui/Modal.vue` — generic modal shell
  - Props: `visible`, `title`
  - Emits: `close`
  - Teleport to body
  - Escape key + backdrop click to close
  - Scoped CSS from `css/modals.css` (491 LOC)
- [ ] **3C.2** Create `components/modals/AnomalyModal.vue` — anomaly detail view
- [ ] **3C.3** Create `components/modals/SettingsModal.vue` — threshold settings
- [ ] **3C.4** Create `components/modals/AgentModal.vue` — agent insights detail

**Deliverable:** Modal system using Vue's Teleport instead of manual DOM manipulation.

### 3D: Insights + Stream Components

- [ ] **3D.1** Create `components/insights/InsightsPanel.vue`
  - Maps from: `js/insights.js` (343 LOC) + `css/ai-agent.css` (360 LOC)
  - Anomaly filtering via computed properties (not DOM manipulation)
  - Agent pause/resume toggle
- [ ] **3D.2** Create `components/stream/MqttStream.vue`
  - Maps from: `js/stream.js` (112 LOC) + `css/stream.css` (136 LOC)
  - Stream pause/resume
  - Event type filtering

**Deliverable:** Insights and stream panels render live data from Pinia stores.

### 3E: Chat Component

- [ ] **3E.1** Create `components/chat/ChatPanel.vue`
  - Maps from: `js/chat.js` (146 LOC) + `css/chat.css` (352 LOC)
  - Suggested questions, message history, input handling
  - Uses WebSocket composable for `ask_claude` messages

**Deliverable:** Chat panel works with backend via WebSocket.

---

## Phase 4: COO Persona Views

3 COO views + the main dashboard. Current total: ~1,165 LOC across 4 JS files.

- [ ] **4.1** Create `views/coo/Dashboard.vue` — main COO dashboard
  - Maps from: main section of `index.html` + `js/dashboard-render.js` (439 LOC)
  - Compose from: OEE gauges, line charts, insights panel, stream, factory selector
  - Scoped CSS from: `css/metrics.css` (113 LOC), `css/scorecard.css`, `css/layout.css` (63 LOC)
- [ ] **4.2** Create `views/coo/Enterprise.vue` — enterprise comparison
  - Maps from: `js/coo-enterprise.js` (165 LOC) + `css/coo-views.css` (469 LOC partial)
  - Own composable for data fetching if needed
- [ ] **4.3** Create `views/coo/Trends.vue` — trend analysis with charts
  - Maps from: `js/coo-trends.js` (285 LOC) + `css/coo-views.css` partial
  - Chart.js instances via vue-chartjs components
- [ ] **4.4** Create `views/coo/Agent.vue` — agent Q&A
  - Maps from: `js/coo-agent.js` (222 LOC) + `css/coo-views.css` partial
  - POST to `/api/agent/ask`
- [ ] **4.5** Verify all 4 COO views render correctly with live data
- [ ] **4.6** Verify COO sub-navigation switches between views

**Deliverable:** Full COO persona working with live data. Compare side-by-side with old frontend.

---

## Phase 5: Plant Manager Persona Views

4 Plant Manager views. Current total: ~822 LOC across 4 JS files.

- [ ] **5.1** Create `views/plant/LineStatus.vue` — line status grid
  - Maps from: `js/plant-line-status.js` (158 LOC) + `css/plant-views.css` (685 LOC partial)
- [ ] **5.2** Create `views/plant/OEEDrilldown.vue` — OEE gauge + detail charts
  - Maps from: `js/plant-oee-drilldown.js` (259 LOC) + `css/plant-views.css` partial + `css/line-oee.css` (175 LOC)
- [ ] **5.3** Create `views/plant/Equipment.vue` — filterable equipment grid
  - Maps from: `js/plant-equipment.js` (182 LOC) + `css/equipment.css` (136 LOC)
  - Equipment state filtering via computed properties
- [ ] **5.4** Create `views/plant/Alerts.vue` — alerts + CMMS work orders
  - Maps from: `js/plant-alerts.js` (223 LOC) + `css/plant-views.css` partial
  - Severity filtering
  - CMMS work order display
- [ ] **5.5** Verify all 4 Plant Manager views render correctly with live data
- [ ] **5.6** Verify Plant Manager sub-navigation switches between views

**Deliverable:** Full Plant Manager persona working with live data.

---

## Phase 6: Demo Persona Views

3 Demo views. Current total: ~726 LOC across 3 JS files.

- [ ] **6.1** Create `views/demo/Scenarios.vue` — scenario launcher
  - Maps from: `js/demo-scenarios.js` (196 LOC) + `css/demo.css` (703 LOC partial)
  - Fetch scenarios from `/api/demo/scenarios`
  - Start/stop via POST endpoints
- [ ] **6.2** Create `views/demo/Inject.vue` — anomaly injection controls
  - Maps from: `js/demo-inject.js` (314 LOC) + `css/demo.css` partial
  - Form for injection parameters (type, equipment, severity, duration)
- [ ] **6.3** Create `views/demo/Timer.vue` — reset controls + presentation timer
  - Maps from: `js/demo-timer.js` (216 LOC) + `css/demo.css` partial
  - Timer logic (start, pause, reset, presets)
  - Data reset via POST `/api/demo/reset`
- [ ] **6.4** Verify all 3 Demo views work correctly
- [ ] **6.5** Verify Demo sub-navigation switches between views

**Deliverable:** Full Demo persona working. All demo controls functional.

---

## Phase 7: Integration + Polish

Everything works individually. Now make it seamless.

- [ ] **7.1** Responsive design — migrate `css/responsive.css` (46 LOC) media queries
  - Test at 1920px, 1440px, 1024px, 768px
- [ ] **7.2** Verify all keyboard shortcuts work (persona switching, modal close on Escape)
- [ ] **7.3** Verify localStorage persistence (factory selection, theme preferences)
- [ ] **7.4** Verify WebSocket reconnection behavior (disconnect/reconnect gracefully)
- [ ] **7.5** Verify all `setInterval` refreshes are cleaned up on unmount (no memory leaks)
- [ ] **7.6** Verify Chart.js instances are destroyed on component unmount
- [ ] **7.7** Cross-browser test: Chrome, Firefox, Safari
- [ ] **7.8** Performance check: open browser devtools Performance tab, verify no re-render storms
- [ ] **7.9** Compare old vs new side-by-side — ensure feature parity

**Deliverable:** Vue frontend is functionally identical to vanilla frontend.

---

## Phase 8: CI/CD + Deployment

- [ ] **8.1** Add `npm run build` to production build
  - Update `.github/workflows/deploy-frontend.yml` to build Vue app first
  - Output: `frontend/dist/` → S3 sync
- [ ] **8.2** Update Dockerfile if frontend is served from backend container
  - Or: separate frontend build step in CI, deploy dist/ to S3
- [ ] **8.3** Verify CloudFront serves built Vue app correctly
- [ ] **8.4** Verify WebSocket connection works through CloudFront/ALB
- [ ] **8.5** Verify all API proxy paths work in production

**Deliverable:** Vue frontend deployed to production via CI/CD.

---

## Phase 9: Cleanup

- [ ] **9.1** Delete old `js/` directory (22 files, 5,181 LOC)
- [ ] **9.2** Delete old `css/` directory (22 files, 5,352 LOC)
- [ ] **9.3** Delete old `index.html` (840 LOC)
- [ ] **9.4** Update `CLAUDE.md` — frontend section now describes Vue app structure
- [ ] **9.5** Update `docs/project_notes/key_facts.md` — add Vue-specific facts
- [ ] **9.6** Update `docs/architecture/3-components.md` — frontend component tree
- [ ] **9.7** Run `npm test` — ensure all backend tests still pass
- [ ] **9.8** Final commit and tag: `v2.0.0-vue`

**Deliverable:** Clean repo. No zombie code. All docs updated.

---

## File Mapping Reference

For each migration task, this maps old file → new Vue equivalent.

### JS Modules → Vue Components/Composables

| Old File (js/) | LOC | New Location | Type |
|----------------|-----|-------------|------|
| `state.js` | 102 | `stores/app.ts`, `stores/connection.ts`, `stores/persona.ts`, `stores/demo.ts` | Pinia stores |
| `app.js` | 352 | `App.vue` + `main.ts` + Vue Router config | Entry point |
| `websocket.js` | 267 | `composables/useWebSocket.ts` | Composable |
| `dashboard-data.js` | 472 | `composables/useOEE.ts`, `useEquipment.ts`, `useQuality.ts` | Composables |
| `dashboard-render.js` | 439 | Split across view components (template + computed) | Views |
| `charts.js` | 185 | `components/charts/*.vue` (4 chart components) | Components |
| `insights.js` | 343 | `components/insights/InsightsPanel.vue` | Component |
| `stream.js` | 112 | `components/stream/MqttStream.vue` | Component |
| `modals.js` | 343 | `components/ui/Modal.vue` + 3 specific modals | Components |
| `chat.js` | 146 | `components/chat/ChatPanel.vue` | Component |
| `persona.js` | 147 | Vue Router + `stores/persona.ts` | Router + Store |
| `utils.js` | 53 | `utils/index.ts` | Utility |
| `coo-enterprise.js` | 165 | `views/coo/Enterprise.vue` | View |
| `coo-trends.js` | 285 | `views/coo/Trends.vue` | View |
| `coo-agent.js` | 222 | `views/coo/Agent.vue` | View |
| `plant-line-status.js` | 158 | `views/plant/LineStatus.vue` | View |
| `plant-oee-drilldown.js` | 259 | `views/plant/OEEDrilldown.vue` | View |
| `plant-equipment.js` | 182 | `views/plant/Equipment.vue` | View |
| `plant-alerts.js` | 223 | `views/plant/Alerts.vue` | View |
| `demo-scenarios.js` | 196 | `views/demo/Scenarios.vue` | View |
| `demo-inject.js` | 314 | `views/demo/Inject.vue` | View |
| `demo-timer.js` | 216 | `views/demo/Timer.vue` | View |

### CSS Files → Scoped Styles

| Old File (css/) | LOC | New Location |
|-----------------|-----|-------------|
| `variables.css` | 30 | `src/assets/variables.css` (global) |
| `base.css` | 133 | `src/assets/base.css` (global) |
| `animations.css` | 184 | `src/assets/animations.css` (global) |
| `layout.css` | 63 | `App.vue` `<style>` |
| `responsive.css` | 46 | `App.vue` `<style>` or per-component |
| `command-bar.css` | 245 | `CommandBar.vue` `<style scoped>` |
| `connection.css` | 72 | `ConnectionStatus.vue` `<style scoped>` |
| `footer.css` | 54 | `Footer.vue` `<style scoped>` |
| `cards.css` | 176 | `Card.vue` `<style scoped>` |
| `metrics.css` | 113 | `Dashboard.vue` `<style scoped>` |
| `scorecard.css` | 164 | `OEEGauge.vue` `<style scoped>` |
| `charts.css` | 193 | Chart components `<style scoped>` |
| `stream.css` | 136 | `MqttStream.vue` `<style scoped>` |
| `ai-agent.css` | 360 | `InsightsPanel.vue` `<style scoped>` |
| `equipment.css` | 136 | `Equipment.vue` `<style scoped>` |
| `batch.css` | 292 | Relevant view `<style scoped>` |
| `quality.css` | 80 | Relevant view `<style scoped>` |
| `modals.css` | 491 | `Modal.vue` + specific modals `<style scoped>` |
| `chat.css` | 352 | `ChatPanel.vue` `<style scoped>` |
| `demo.css` | 703 | Split across 3 demo views `<style scoped>` |
| `coo-views.css` | 469 | Split across 4 COO views `<style scoped>` |
| `plant-views.css` | 685 | Split across 4 Plant views `<style scoped>` |
| `line-oee.css` | 175 | `OEEDrilldown.vue` `<style scoped>` |

---

## Anti-Patterns to Avoid

These are the things that will create technical debt. Watch for them.

| Anti-Pattern | Why It's Bad | What To Do Instead |
|-------------|-------------|-------------------|
| Creating a `BaseComponent` or `AbstractView` | Over-abstraction. Views aren't that similar. | Let views be independent. Compose with slots. |
| Adding Vuetify/PrimeVue "just for one component" | 200KB+ dependency for one dropdown. | Write the component yourself. It's a dashboard. |
| `$emit` chains more than 2 levels deep | Prop drilling. Hard to trace data flow. | Use Pinia store for cross-component state. |
| Watchers instead of computed properties | Watchers are imperative. Computed is reactive. | Default to `computed()`. Use `watch()` only for side effects. |
| `ref()` for everything | Primitive reactivity when object reactivity is needed. | Use `reactive()` for objects, `ref()` for primitives. |
| Global event bus | Recreates the window.* global problem we're fixing. | Use Pinia stores or provide/inject. |
| Async setup in components | Suspense is experimental. Async in setup blocks rendering. | Fetch in `onMounted()` with loading states. |
| `v-html` for user content | XSS vulnerability. | Use template interpolation. Only use `v-html` for trusted AI-generated HTML. |
| Creating a `types/` directory with 500 lines of types | Over-typing. Types should serve the code, not the other way around. | Type props, stores, and API responses. Let TS infer the rest. |
| Making every component accept 10+ props | God component. | Split into smaller components. 3-5 props max per component. |
