---
scope: EdgeMind frontend only (js/, css/, index.html). Backend (server.js, lib/) unchanged. Deployment pipeline needs update for build step (npm run build → static assets).
kind: system
content_hash: 0a19c4e128d1ca45f1df38c75f5bb049
---

# Hypothesis: React (Vite + React 19) Migration

Migrate the EdgeMind frontend to React 19 with Vite as the build system. Strategy: (1) Set up Vite + React + TypeScript scaffold alongside existing frontend, (2) Convert each of the 22 JS modules into React components with hooks for state (useState/useReducer), (3) Replace MutationObserver routing with React Router, (4) Replace 311 DOM manipulation calls with JSX declarative rendering, (5) Replace 78 window globals with React Context + useContext, (6) Wrap Chart.js instances in custom hooks or use react-chartjs-2, (7) WebSocket managed via custom useWebSocket hook with context provider, (8) CSS modules or Tailwind for scoped styling, (9) Backend stays untouched - React app consumes same REST + WebSocket APIs.

Estimated component breakdown: ~35-45 React components from 22 JS modules + index.html sections. Persona system becomes a router with nested routes. State consolidation from 5 mutable objects into 2-3 context providers or Zustand stores.

LOE estimate: 3-4 weeks for a single developer with React experience. Higher upfront cost but largest ecosystem and hiring pool.

## Rationale
{"anomaly": "11,373 LOC vanilla frontend with no component model, 311 DOM manipulation calls, 78 window globals, MutationObserver routing", "approach": "Full migration to React 19 + Vite + TypeScript. Largest ecosystem, best hiring pool, hooks map well to existing module pattern. Vite provides HMR and fast builds.", "alternatives_rejected": ["React with Webpack (Vite is faster and simpler)", "React with JavaScript only (TypeScript adds type safety during migration)"]}