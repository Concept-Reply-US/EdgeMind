---
id: cesmii-native-consumer
type: hypothesis
created: 2026-02-10
problem: Implement CESMII SM Profiles in EdgeMind for hackathon
status: L2
decided_in: DRR-001
decision_date: 2026-02-10
deduction_passed: 2026-02-10
deduction_notes: |
  Passed logical consistency check.
  Key finding: All integration points exist — MQTT handler has clear JSON branch,
  InfluxDB writer accepts tags, existing patterns (Sparkplug B, demo engine) prove
  the codebase supports protocol-specific message routing. No contradictions found.
  Ready for empirical verification.
formality: 3
novelty: Conservative
complexity: Medium
author: Claude (generated), Human (to review)
scope:
  applies_to: "EdgeMind backend receiving CESMII-profiled MQTT payloads"
  not_valid_for: "Non-MQTT protocols, non-CESMII data sources"
  scale: "Single factory broker, ~100 work orders/day"
---

# Hypothesis: Native CESMII Consumer — Detect, Validate, and Store SM Profile Payloads

## 1. The Method (Design-Time)

### Proposed Approach
Build a dedicated CESMII module (`lib/cesmii/`) that intercepts JSON payloads on MQTT, detects SM Profile-typed messages via `@type` and `profileDefinition` fields in JSON-LD, validates them against bundled profile schemas (WorkOrderV1.jsonld, FeedIngredientV1.jsonld), and writes validated work orders to InfluxDB with profile-aware tags. The existing MQTT handler in server.js gets a new branch: if the payload is JSON-LD with a `@type`, route it through the CESMII validator before storage.

### Rationale
This is the most direct implementation of what the hackathon requires. The reference repo publishes WorkOrderV1 payloads to MQTT — our job is to consume them intelligently. By building a JSON-LD-aware validator in Node.js (porting the Python validator concept), we demonstrate that EdgeMind understands SM Profiles as semantic contracts, not just raw data. This is the conservative, "do exactly what's asked" approach.

### Implementation Steps
1. Bundle WorkOrderV1.jsonld and FeedIngredientV1.jsonld into `lib/cesmii/profiles/`
2. Build a Node.js SM Profile validator (`lib/cesmii/validator.js`) that checks payloads against profile schemas (type checking for OPC UA types, required fields, nested structures)
3. Add CESMII message detection in the MQTT handler — if payload is JSON and contains `@type`, route to CESMII handler
4. Write validated work orders to InfluxDB with tags: `profile_type`, `profile_version`, `validation_status`
5. Add `/api/cesmii/work-orders` REST endpoint to query stored work orders
6. Add `/api/cesmii/profiles` endpoint listing available profiles
7. Frontend: Add work orders panel showing incoming CESMII data with validation status
8. AI context: Include work order data in Claude's trend analysis context

### Expected Capability
- Real-time CESMII payload detection and validation
- Profile-aware data storage in InfluxDB
- REST API for work order queries
- Dashboard visualization of work order flow
- AI analysis incorporating work order context

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Medium | Requires validator port from Python + new module, but follows existing patterns |
| **Explanatory Power** | High | Directly addresses hackathon requirement — consume and validate SM Profiles |
| **Consistency** | High | Follows existing lib/ module pattern, uses same InfluxDB/MQTT/WebSocket stack |
| **Falsifiability** | High | Clear pass/fail: either validates WorkOrderV1 payloads correctly or doesn't |

**Plausibility Verdict:** PLAUSIBLE

### Assumptions to Verify
- [ ] The CESMII work order publisher actually publishes to a topic we're subscribed to (we sub to '#')
- [ ] JSON-LD payloads can be distinguished from plain numeric MQTT values by attempting JSON.parse
- [ ] OPC UA type validation (Int32, Int64, Double, DateTime, etc.) can be implemented in JS without heavy dependencies
- [ ] InfluxDB can store structured work order data meaningfully (not just flat numeric values)

### Required Evidence
- [ ] **Internal Test:** Parse a sample WorkOrderV1 JSON-LD payload and validate all fields
  - **Performer:** typescript-engineer (it's Node.js)
- [ ] **Research:** Confirm what topic the eukodyne publisher uses (configurable, default `uns/workorders/demo`)
  - **Performer:** AI Agent

## Falsification Criteria
- If the MQTT broker doesn't carry CESMII-profiled payloads (publisher not running), we can't demonstrate live consumption
- If JSON-LD type checking requires a full RDF library that's too heavy for Node.js
- If InfluxDB's schema can't meaningfully store nested work order structures

## Estimated Effort
2-3 days (validator: 1 day, integration: 1 day, frontend: 0.5 day, testing: 0.5 day)

## Weakest Link
The validator port from Python to Node.js — OPC UA type checking for 10+ types with nested structure support. If this is more complex than expected, it could slow everything down.
