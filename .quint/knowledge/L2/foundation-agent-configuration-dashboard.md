---
kind: system
scope: EdgeMind frontend + backend, applies to all agentic loop configurations, independent of which noise reduction strategy is chosen
content_hash: 63e8900cba479d2d9efae31cdd3a9c28
---

# Hypothesis: Foundation: Agent Configuration Dashboard

**Method:**
Build a configuration UI for controlling the agentic loop behavior dynamically without code changes.

**Core Controls:**
1. **Interval Control:**
   - Slider for analysis interval (30s → 30min range)
   - Enable/disable adaptive intervals
   
2. **Severity Thresholds:**
   - Minimum severity score to create work order (0-100)
   - Per-anomaly-type severity overrides
   
3. **Deduplication Settings:**
   - Deduplication window (minutes)
   - Clustering radius (same area vs same site)
   
4. **Work Order Controls:**
   - Enable/disable CMMS integration
   - Work order creation rules (always, threshold, manual approval)
   
5. **Memory/History:**
   - Anomaly retention period
   - View recent anomalies with suppression status
   - Manual override: "Mark as known issue, stop creating work orders"

**Implementation:**
- New frontend page: `/config-dashboard.html`
- New API endpoint: `GET/POST /api/config/agent`
- Store config in InfluxDB or JSON file
- Hot reload: agent reads config on each iteration
- ~300 lines frontend + 100 lines backend

**UI Location:**
- Add to command bar as admin-only "⚙️ Agent Config" button
- Requires basic auth or demo mode bypass

## Rationale
{"anomaly": "Agentic loop parameters are hardcoded in server.js, requiring code changes and redeployment to tune behavior", "approach": "Build configuration UI that allows runtime tuning of all agent parameters, making any noise reduction strategy controllable without code changes", "alternatives_rejected": ["Environment variables only (requires restart)", "Config file only (not user-friendly)", "Keep hardcoded (defeats purpose of configurability)"]}