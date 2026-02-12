---
id: DRR-001
title: "Implement CESMII SM Profiles: Bidirectional Consumer + Publisher"
status: ACCEPTED
date: 2026-02-10
decision_makers:
  - "Stefan Bekker — Project Owner"
  - "Claude — Analyst/Advisor"
supersedes: none
hypothesis_selected: "cesmii-native-consumer + cesmii-bidirectional"
alternatives_rejected: ["cesmii-lightweight-semantic (dropped in abduction)", "cesmii-ai-profile-interpreter (deferred by owner)"]
---

# DRR-001: Implement CESMII SM Profiles — Bidirectional Consumer + Publisher

## Executive Summary

**Decision:** Build a CESMII SM Profile consumer AND publisher in EdgeMind. Consume incoming WorkOrderV1 payloads from MQTT with validation, and publish EdgeMind's own data (OEE reports, AI insights) back to the UNS as custom SM Profile-compliant JSON-LD payloads. Include a self-contained demo publisher fallback.

**Based on:** H1 (Native Consumer, R_eff=1.00) + H2 (Bidirectional, R_eff=0.90) combined

**Key evidence:** ProveIt 2026 Sponsors Documentation mandates publishing data back to UNS; CESMII ProveIt-SMProfiles guide officially supports custom profiles via JSON Schema on GitHub.

## Context

### Problem Statement
Implement CESMII SM Profiles in EdgeMind for the ProveIt! Conference 2026 hackathon, per the eukodyne/cesmii reference implementation and official conference requirements.

### Trigger
ProveIt 2026 is Feb 16-20. SM Profile implementation is a conference collaboration requirement ("should attempt"). Publishing back to UNS is a hard requirement ("must").

### Constraints
- Node.js codebase (not Python like reference implementation)
- Solo developer + AI agents
- ~6 days to conference
- Must integrate with existing MQTT/InfluxDB/WebSocket architecture
- Must connect live at the conference venue

### Success Criteria
1. EdgeMind detects and validates incoming CESMII JSON-LD payloads (WorkOrderV1)
2. Validated work orders are stored in InfluxDB with profile metadata
3. EdgeMind publishes its own SM Profile-compliant data back to MQTT
4. Custom profiles are hosted on GitHub as JSON-LD schemas
5. Dashboard shows work orders flowing in real-time with validation status
6. Demo publisher fallback works if eukodyne publisher isn't running
7. All existing tests pass (`npm test`)

## Decision

**We will:**
- Build `lib/cesmii/` module with: detector, validator, publisher, profile schemas
- Port the Python SM Profile validator to Node.js (~500-800 lines)
- Bundle WorkOrderV1.jsonld and FeedIngredientV1.jsonld profiles
- Define custom FactoryInsightV1.jsonld and OEEReportV1.jsonld profiles
- Add CESMII-aware MQTT interception before `parseTopicToInflux()` runs
- Add REST endpoints: `/api/cesmii/work-orders`, `/api/cesmii/profiles`
- Add frontend work orders panel
- Build CESMII demo publisher fallback in demo engine
- Publish custom profiles on GitHub

**We will NOT:**
- Implement AI-powered profile interpretation (H4 deferred by owner)
- Use the CESMII Profile Designer tool (Method 2: JSON Schema on GitHub instead)
- Implement full JSON-LD RDF processing (treat .jsonld as plain JSON)
- Build an OPC UA server
- Modify existing Enterprise A/B/C data handling

**Based on hypotheses:**
- `.fpf/knowledge/L2/cesmii-native-consumer-hypothesis.md`
- `.fpf/knowledge/L2/cesmii-bidirectional-hypothesis.md`

## Alternatives Considered

### H3: Lightweight Semantic Layer (Dropped)

- **Status:** Dropped in abduction phase
- **Summary:** Skip full validation, just detect and display CESMII payloads
- **Why rejected:** User chose depth over shortcuts. Credibility risk in a conference focused on SM Profiles.

### H4: AI-Powered Profile Interpreter (Deferred)

- **Status:** L1 (passed deduction + research, WLNK R_eff=0.60)
- **Summary:** Feed SM Profile definitions to Claude for semantic reasoning over work orders
- **WLNK R_eff:** 0.60 (AI output quality untested)
- **Why deferred:** Owner decision to focus on core consumer+publisher functionality first. Can be added later as enhancement. The AI quality risk (untested) makes it the right feature to defer under time pressure.

## Evidence Summary

### Supporting Evidence

| Claim | Evidence | Type | Congruence | R_eff |
|-------|----------|------|------------|-------|
| Validator portable to Node.js | `evidence/2026-02-10-cesmii-validator-portability.md` | external | high | 1.00 |
| MQTT topic caught by `#` | `evidence/2026-02-10-mqtt-topic-integration.md` | external | high | 1.00 |
| Custom profiles accepted | `evidence/2026-02-10-proveit-smprofile-requirements.md` | external | high | 1.00 |
| Publishing back to UNS required | `evidence/2026-02-10-proveit-sponsor-requirements.md` | external | high | 1.00 |
| MQTT publish works | key_facts.md + demo engine code | internal | — | 1.00 |

### WLNK Calculation

```
H1 R_eff = min(1.00, 1.00, 1.00, 1.00) = 1.00
H2 R_eff = min(1.00, 1.00, 1.00, 0.90) = 0.90
Combined R_eff = min(1.00, 0.90) = 0.90
Weakest link: JSON Schema on GitHub method (0.90) — documented but no ProveIt vendor example seen
```

### Evidence Gaps

- No empirical validator test yet (will be created during implementation)
- No confirmation eukodyne publisher will run at conference (mitigated by demo fallback)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| eukodyne publisher not running at conference | Medium | High | Build CESMII demo publisher fallback | Stefan |
| Validator bugs misvalidate payloads | Medium | Medium | Unit tests with sample payloads | Stefan |
| Conference network blocks Fargate→MQTT | Low | High | Prepare local laptop fallback | Stefan |
| Custom profiles seen as "informal" | Low | Low | Can register on Profile Designer later | Stefan |
| Time runs out before H2 (publisher) complete | Medium | Medium | H1 (consumer) works standalone | Stefan |

## Validity Conditions

This decision remains valid **WHILE:**
- ProveIt 2026 conference requirements remain as documented
- Node.js is the backend language
- MQTT broker accepts `conceptreply` user for publishing
- eukodyne WorkOrderV1 profile schema doesn't change

**Re-evaluate IF:**
- CESMII tech committee changes from "should attempt" to specific tool requirements
- Conference adds mandatory validation testing of SM Profile implementations
- Time pressure forces scope reduction (cut H2, keep H1)
- H4 (AI interpreter) is requested — revisit with `/q1-hypothesize`

## Implementation Plan

### Priority Order (H1 → H2 → Fallback)

#### Phase 1: Foundation — lib/cesmii/ module (Day 1-2)
1. Create `lib/cesmii/profiles/` — bundle WorkOrderV1.jsonld, FeedIngredientV1.jsonld
2. Build `lib/cesmii/validator.js` — Node.js SM Profile validator (OPC UA type checking)
3. Build `lib/cesmii/detector.js` — JSON-LD detection (check `@type`, `@context`)
4. Unit tests for validator with sample payloads
5. Run `npm test` to verify nothing breaks

#### Phase 2: Consumer Integration — server.js + InfluxDB (Day 2-3)
1. Add CESMII interception in MQTT handler (before `parseTopicToInflux`)
2. Store validated work orders in InfluxDB with profile-aware tags
3. Add REST endpoints: `/api/cesmii/work-orders`, `/api/cesmii/profiles`
4. WebSocket broadcast of work order events
5. Integration tests

#### Phase 3: Publisher — lib/cesmii/publisher.js (Day 3-4)
1. Define custom profiles: FactoryInsightV1.jsonld, OEEReportV1.jsonld
2. Build publisher module that wraps EdgeMind outputs in JSON-LD
3. Publish OEE reports to `edgemind/oee/{enterprise}/{site}` topics
4. Publish AI insights to `edgemind/insights/{enterprise}` topics
5. Add `/api/cesmii/publish` endpoint for on-demand publication

#### Phase 4: Frontend + Demo Fallback (Day 4-5)
1. Add work orders panel to dashboard
2. Show validation status, product details, ingredient breakdown
3. Build CESMII demo publisher in demo engine (fallback if no external publisher)
4. Visual polish for 45-minute live demo

#### Phase 5: Testing + Polish (Day 5-6)
1. Full integration test with live MQTT broker
2. End-to-end: publish → consume → validate → store → display
3. Prepare demo script for presentation
4. Verify all `npm test` suites pass

### Follow-up Items (Post-Conference)
- [ ] Consider H4 (AI Profile Interpreter) as enhancement
- [ ] Register custom profiles on CESMII Profile Designer (Method 1)
- [ ] Add validation for additional SM Profiles beyond WorkOrderV1

## Consequences

### Expected Positive Outcomes
- Full ProveIt 2026 compliance (consume from + publish to UNS)
- CESMII collaboration requirement met (SM Profiles implemented)
- Demonstrates EdgeMind as a profile-aware factory intelligence platform
- Reusable CESMII module for future SM Profile integrations
- Strong 45-minute live demo with real-time work order visualization

### Accepted Trade-offs
- H4 (AI interpretation) deferred — misses differentiator opportunity
- JSON Schema method (Method 2) instead of Profile Designer (Method 1) — less formal
- Validator is custom Node.js, not using official CESMII .NET libraries

### Potential Negative Outcomes (Accepted Risks)
- If no external work orders arrive, demo relies on self-published fallback data
- Custom profiles may be seen as less authoritative than Profile Designer profiles

## Audit Trail

### Reasoning Cycle
- **Problem defined:** 2026-02-10
- **Hypotheses generated:** 4 on 2026-02-10 (H1 conservative, H2 innovative, H3 minimal, H4 novel)
- **Human selected:** H1, H2, H4 (dropped H3)
- **Deduction completed:** 2026-02-10 — 3 passed (all L1), 0 failed
- **Research completed:** 2026-02-10 — 5 evidence files created, all high congruence
- **Audit completed:** 2026-02-10 — 0 blockers, 3 warnings, PROCEED WITH CAUTION
- **Decision finalized:** 2026-02-10 — H1+H2 accepted, H4 deferred by owner

### Key Decisions During Cycle
- Dropped H3 (lightweight) in favor of depth
- Discovered H2 is required (not optional) from sponsors documentation
- Deferred H4 (AI interpreter) to focus on core compliance features
- Added CESMII demo publisher fallback to mitigate conference risk

## References

- **Session archive:** `.fpf/sessions/2026-02-10-cesmii-profiles.md`
- **Winning hypotheses:** `.fpf/knowledge/L2/cesmii-native-consumer-hypothesis.md`, `.fpf/knowledge/L2/cesmii-bidirectional-hypothesis.md`
- **Deferred hypothesis:** `.fpf/knowledge/L1/cesmii-ai-profile-interpreter-hypothesis.md`
- **Evidence files:** `.fpf/evidence/2026-02-10-*.md` (5 files)
- **External references:**
  - https://github.com/eukodyne/cesmii
  - https://github.com/cesmii/ProveIt-SMProfiles
  - ProveIt 2026 Sponsors Documentation (PDF)
