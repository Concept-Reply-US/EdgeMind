---
scope: EdgeMind frontend only. Backend unchanged. CI/CD needs ng build step. Larger bundle size than React/Vue unless tree-shaking is tuned.
kind: system
content_hash: 648f20cafdca063a412c520c9a6e078d
---

# Hypothesis: Angular 19 Migration

Migrate the EdgeMind frontend to Angular 19 with its built-in CLI toolchain. Strategy: (1) ng new generates project scaffold with TypeScript, routing, and build system out of the box, (2) Convert 22 JS modules into Angular components with services for shared state, (3) Replace MutationObserver routing with Angular Router (supports nested routes for persona views), (4) Replace DOM manipulation with Angular templates and directives, (5) Replace window globals with injectable services (singleton pattern built-in via DI), (6) RxJS Observables for WebSocket stream - natural fit for real-time data, (7) Chart.js via ng2-charts wrapper, (8) Component-scoped CSS by default (ViewEncapsulation), (9) Backend unchanged.

Estimated component breakdown: ~40-50 components + 8-10 services. Angular's opinionated structure forces good architecture. RxJS is ideal for WebSocket/real-time data streams. Built-in forms, HTTP client, and testing framework.

LOE estimate: 4-5 weeks for a single developer. Steeper learning curve than React/Vue. More boilerplate per component. But strongest conventions and most complete framework (no library selection needed).

## Rationale
{"anomaly": "11,373 LOC vanilla frontend with no component model, 311 DOM manipulation calls, 78 window globals, MutationObserver routing", "approach": "Full migration to Angular 19. Batteries-included framework with DI, RxJS (ideal for WebSocket streams), opinionated project structure. Best for teams that want enforced conventions.", "alternatives_rejected": ["Angular with standalone components only (still need modules for DI)", "AnalogJS (too new, small ecosystem)"]}