---
scope: EdgeMind frontend, incremental migration. No backend changes. Minimal CI/CD changes (add vite build). Low risk - always deployable.
kind: system
content_hash: a855a20ecaaf11859ea2043afd0b2d63
---

# Hypothesis: Conservative: Vanilla ES Modules + Lit Web Components + Vite

Keep the existing vanilla architecture but address the core pain points incrementally using Web Components (via Lit) and Vite. Strategy: (1) Add Vite as build system for bundling, HMR, and dev server, (2) Convert the most painful modules into Lit Web Components incrementally (start with persona views, modals, charts), (3) Replace window globals with a lightweight event bus or a simple reactive store (e.g., nanostores - 400 bytes), (4) Replace MutationObserver with a minimal router (e.g., @vaadin/router or custom hash router), (5) Keep existing CSS files but scope them to components as they migrate, (6) No full rewrite required - old vanilla code coexists with new Lit components.

This approach allows incremental migration: convert 2-3 modules per sprint while keeping the app fully functional. No big-bang rewrite risk. Web Components are framework-agnostic so they survive future framework changes.

LOE estimate: 1.5-2 weeks for initial setup + first wave of components. Then ongoing 0.5-1 week per module conversion. Total to feature parity: ~4-6 weeks but spread across sprints with zero downtime.

## Rationale
{"anomaly": "11,373 LOC vanilla frontend with no component model, 311 DOM manipulation calls, 78 window globals, MutationObserver routing", "approach": "Incremental modernization using Lit Web Components + Vite. No big-bang rewrite. Coexists with existing code. Web Components are a web standard, not a framework - future-proof.", "alternatives_rejected": ["Stencil.js (more complex than Lit for this use case)", "Vanilla + no framework (doesn't solve the component model problem)"]}