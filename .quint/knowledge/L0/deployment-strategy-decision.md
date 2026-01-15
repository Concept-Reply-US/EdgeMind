---
scope: EdgeMind project deployment infrastructure
kind: episteme
content_hash: 31700316da72459c2affe5239ab06809
---

# Hypothesis: Deployment Strategy Decision

Parent decision holon to group competing deployment approaches. The decision criteria are: (1) deployment friction reduction, (2) operational simplicity, (3) cost reasonability, (4) compatibility with WebSocket/MQTT architecture.

## Rationale
{"anomaly": "EC2 deployment causes friction - manual scp, docker cp, file loss on container recreation", "approach": "Evaluate modern AWS deployment options", "alternatives_rejected": []}