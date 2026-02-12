---
id: mqtt-topic-integration
type: external-research
source: web
created: 2026-02-10
hypothesis: .fpf/knowledge/L1/cesmii-native-consumer-hypothesis.md
assumption_tested: "The CESMII work order publisher publishes to a topic we're subscribed to"
valid_until: 2026-03-01
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "eukodyne reference publisher targeting ProveIt MQTT infrastructure"
  our_context: "EdgeMind subscribing to same ProveIt MQTT infrastructure"
  justification: "Same broker, same conference, same UNS"
sources:
  - url: https://raw.githubusercontent.com/eukodyne/cesmii/main/config.json
    title: "eukodyne CESMII config.json"
    type: official-docs
    accessed: 2026-02-10
    credibility: high
  - url: https://raw.githubusercontent.com/eukodyne/cesmii/main/workorder_publisher.py
    title: "eukodyne Work Order Publisher source"
    type: official-docs
    accessed: 2026-02-10
    credibility: high
scope:
  applies_to: "EdgeMind receiving work orders from eukodyne publisher on ProveIt broker"
  not_valid_for: "Production non-ProveIt MQTT deployments"
---

# Research: MQTT Topic Pattern for CESMII Work Orders

## Purpose
Confirm that EdgeMind's `#` subscription will catch CESMII work order payloads and understand the topic structure.

## Findings

### Topic Pattern
The eukodyne publisher uses topic: `Enterprise B/{username}/cesmii/WorkOrder`

This follows the ProveIt UNS hierarchy:
- Part 1: Enterprise (e.g., "Enterprise B")
- Part 2: Username/Site identifier
- Part 3: Namespace ("cesmii")
- Part 4: Data type ("WorkOrder")

### Detection Strategy
EdgeMind's `#` wildcard catches ALL topics. The CESMII work orders can be detected by:
1. **Payload inspection:** JSON with `@type` field = "WorkOrderV1" and `@context` containing CESMII namespace
2. **Topic pattern:** Contains `/cesmii/` segment (optional, secondary check)
3. **Payload structure:** Has `profileDefinition` field pointing to .jsonld URL

### Publishing Behavior
- QoS: 1 (at-least-once)
- Retained: true (new subscribers get last work order immediately)
- Frequency: Every 10 seconds
- Format: JSON with 2-space indentation

### Integration with Existing Parser
The existing `parseTopicToInflux()` in `lib/influx/writer.js` would parse this topic as:
- enterprise: "Enterprise B" ✓
- site: "{username}" (the user's identifier)
- area: "cesmii"
- machine: "WorkOrder"
- measurement: "WorkOrder" (from last 2 parts)

This is WRONG for work orders — they're structured JSON, not numeric sensor values. The CESMII handler must intercept BEFORE `parseTopicToInflux()` runs.

## Verdict

- [x] Assumption **SUPPORTED** — `#` subscription catches the topic
- [x] Detection via payload `@type` field is reliable
- [⚠] Existing parser would mishandle work orders — need early interception

## Recommendations
- Intercept JSON-LD payloads BEFORE the standard InfluxDB writer runs
- Use payload-based detection (`@type` field) as primary, topic pattern as secondary
- Handle retained messages (first work order arrives immediately on connect)
