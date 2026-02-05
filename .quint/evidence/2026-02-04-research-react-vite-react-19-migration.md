---
valid_until: 2026-05-05
date: 2026-02-04
id: 2026-02-04-research-react-vite-react-19-migration.md
type: research
target: react-vite-react-19-migration
verdict: pass
assurance_level: L2
carrier_ref: test-runner
content_hash: 50b99c39cdcdc5cac7c924e56ebfb947
---

EMPIRICAL EVIDENCE GATHERED:

BUNDLE SIZE: React 19 production bundle ~45KB gzipped. Mid-range — 2x larger than Vue (~20KB) but half of Angular (~65-130KB). Acceptable for a dashboard.

CHART.JS ECOSYSTEM: react-chartjs-2 has ~2,500,000 weekly npm downloads, 6,890 GitHub stars. By far the largest Chart.js wrapper ecosystem. 1,383 dependent packages. Well-maintained, v5.3.1 current.

WEBSOCKET + REAL-TIME: Extensive documentation and case studies for React + WebSocket dashboards. Key finding from InnovationM (Aug 2025): 'Without proper React Performance Optimization, apps will lag as datasets grow, crash browsers rendering thousands of points, and waste CPU with unnecessary re-renders.' Requires explicit optimization: batching updates (not updating on every message), memoization, virtualization. EdgeMind already throttles WebSocket (every 10th message) which helps, but React's reconciliation overhead for real-time data is a known concern requiring useCallback/useMemo/React.memo patterns.

MIGRATION RISK: No incremental migration path — must be big-bang rewrite. TkDodo's blog confirms native WebSocket API integrates cleanly with React state management, so existing WebSocket protocol can be preserved.

VERDICT: Viable but requires explicit performance optimization for real-time data. Largest ecosystem mitigates long-term risk. Big-bang rewrite is the primary concern.