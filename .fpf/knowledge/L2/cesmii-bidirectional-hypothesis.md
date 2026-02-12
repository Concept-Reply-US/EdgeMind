---
id: cesmii-bidirectional
type: hypothesis
created: 2026-02-10
problem: Implement CESMII SM Profiles in EdgeMind for hackathon
status: L2
decided_in: DRR-001
decision_date: 2026-02-10
deduction_passed: 2026-02-10
deduction_notes: |
  Passed with revised assessment. Original weakest link (read-only MQTT) is
  INVALIDATED: key_facts.md confirms write username 'conceptreply' exists and
  demo engine already publishes via mqttClient.publish(). Publishing infrastructure
  is proven. Scope remains the real risk but is manageable if H1 is built first.
  Conditionally depends on H1 completion.
formality: 3
novelty: Novel
complexity: High
author: Claude (generated), Human (to review)
scope:
  applies_to: "EdgeMind as both consumer AND producer of CESMII SM Profile data"
  not_valid_for: "Read-only dashboards with no data generation capability"
  scale: "Single factory broker, bidirectional data flow"
---

# Hypothesis: Bidirectional CESMII — Consume SM Profiles AND Publish EdgeMind's Own Profiled Data

## 1. The Method (Design-Time)

### Proposed Approach
Go beyond consuming the eukodyne work order publisher's output. In addition to H1's consumer capabilities, EdgeMind ALSO publishes its own SM Profile-compliant data back to MQTT. Specifically: define custom SM Profiles for EdgeMind's AI insights (e.g., `FactoryInsightV1`) and OEE calculations (e.g., `OEEReportV1`), publish them as JSON-LD payloads to dedicated MQTT topics, and demonstrate that other CESMII-aware systems can consume EdgeMind's output. This creates a full ecosystem demonstration.

### Rationale
The hackathon wants to see SM Profiles in action as interoperability contracts. If EdgeMind only consumes, it's a one-way demo. If it also produces profile-compliant data, it demonstrates the CESMII vision: any system can produce or consume standardized manufacturing data. This is more impressive for the conference and shows deeper understanding of the SM Profile concept. The AI insights and OEE calculations EdgeMind already generates become first-class SM Profile citizens.

### Implementation Steps
1. Everything from H1 (consumer side)
2. Define `FactoryInsightV1.jsonld` — SM Profile for AI-generated insights with fields: InsightID (Guid), Timestamp (UtcTime), Enterprise (String), Severity (Int32), Category (String), Summary (String), Confidence (Double)
3. Define `OEEReportV1.jsonld` — SM Profile for OEE calculations with fields: ReportID (Guid), Enterprise (String), Site (String), Availability (Double), Performance (Double), Quality (Double), OEE (Double), CalculationTier (String), Timestamp (UtcTime)
4. Build publisher module (`lib/cesmii/publisher.js`) that wraps EdgeMind outputs in JSON-LD with proper `@context`, `@type`, and `profileDefinition` references
5. Publish AI insights as `edgemind/insights/{enterprise}` MQTT topics with SM Profile format
6. Publish OEE reports as `edgemind/oee/{enterprise}/{site}` MQTT topics with SM Profile format
7. Frontend: Show bidirectional flow — incoming work orders AND outgoing profiled insights
8. REST endpoint: `/api/cesmii/publish` to trigger on-demand profile-compliant publications

### Expected Capability
- Everything from H1 (consume, validate, store, display)
- EdgeMind publishes its own SM Profile-compliant MQTT payloads
- Custom profile definitions that follow CESMII standards
- Demonstrates full interoperability — EdgeMind is both consumer and producer
- Conference-impressive bidirectional data flow visualization

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Low | Doubles the scope — consumer + producer + custom profiles |
| **Explanatory Power** | High | Demonstrates the full CESMII vision, not just half of it |
| **Consistency** | High | REVISED: Demo engine already publishes via mqttClient.publish() — proven pattern |
| **Falsifiability** | High | Clear test: validate EdgeMind's published payloads against our own profiles |

**Plausibility Verdict:** PLAUSIBLE (scope risk manageable if layered on H1)

### Assumptions to Verify
- [ ] All assumptions from H1
- [x] ~~MQTT broker allows EdgeMind to publish~~ CONFIRMED: write user 'conceptreply' exists, demo engine publishes
- [ ] Custom SM Profiles are acceptable for the hackathon (not just consuming provided ones)
- [ ] The time budget allows building both consumer and producer within hackathon timeline
- [ ] JSON-LD profile authoring doesn't require the CESMII Profile Designer tool

### Required Evidence
- [ ] **Internal Test:** Publish a FactoryInsightV1 payload and validate it against the profile
  - **Performer:** typescript-engineer
- [ ] **Research:** Verify hackathon scoring criteria — do custom profiles earn extra credit?
  - **Performer:** Developer

## Falsification Criteria
- If hackathon scoring doesn't value custom profile creation
- If time budget is too tight for both directions (doubles the work)
- If custom SM Profiles without the Profile Designer aren't considered "real" CESMII profiles

## Estimated Effort
4-5 days (H1 work: 2.5 days + custom profiles: 1 day + publisher: 1 day + testing: 0.5 day)

## Weakest Link
REVISED: No longer MQTT credentials — it's scope management. Building both consumer and producer could result in neither being polished. Mitigation: build H1 first, layer H2 on top only when H1 is solid.
