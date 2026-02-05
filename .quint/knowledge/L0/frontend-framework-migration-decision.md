---
scope: EdgeMind frontend (js/, css/, index.html) - does not affect Node.js backend (server.js, lib/)
kind: system
content_hash: 94e15ce22c475fc866c983e930585e9c
---

# Hypothesis: Frontend Framework Migration Decision

Parent decision context for evaluating competing frontend framework migration strategies for EdgeMind. The current vanilla ES modules frontend has grown to 11,373 LOC across 44 files with 311 DOM manipulation points, 78 window globals, and no component model, reactivity system, or build toolchain. This decision evaluates whether and how to migrate to a modern framework.

## Rationale
{"anomaly": "Frontend has grown to 11,373 LOC with 22 JS modules and 22 CSS files using vanilla DOM manipulation (311 calls), window globals (78), MutationObserver-based pseudo-routing, and no build system. Adding new views/personas is increasingly fragile.", "approach": "Evaluate React, Angular, Vue, and conservative alternatives for migration", "alternatives_rejected": []}