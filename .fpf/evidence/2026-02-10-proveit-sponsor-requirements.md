---
id: proveit-sponsor-requirements
type: external-research
source: docs
created: 2026-02-10
hypothesis: all
assumption_tested: "ProveIt conference requirements, SM Profile expectations, presentation format"
valid_until: 2026-03-01
decay_action: deprecate
congruence:
  level: high
  penalty: 0.00
  source_context: "Official ProveIt 2026 Sponsors Documentation — the actual conference rules"
  our_context: "EdgeMind is a ProveIt 2026 sponsor integrating with the virtual factory"
  justification: "This IS the authoritative document for our exact situation"
sources:
  - url: local://2026-Sponsors-Documentation.pdf
    title: "ProveIt! 2026 Sponsors Documentation"
    type: official-docs
    accessed: 2026-02-10
    credibility: high
scope:
  applies_to: "All ProveIt 2026 sponsor implementations"
  not_valid_for: "Non-ProveIt implementations"
---

# Research: ProveIt 2026 Official Sponsor Requirements

## Purpose
Extract exact requirements for ProveIt sponsors, SM Profile expectations, presentation format, and integration requirements from the official documentation.

## CRITICAL FINDINGS

### 1. Hard Requirements (Non-Negotiable)

1. **Solutions must integrate TO and FROM the Virtual Factory UNS**
2. **Any new or created data and information must be published BACK to the UNS** ← H2 IS REQUIRED, NOT OPTIONAL
3. Must use own solution or service (may leverage 3rd party tools)
4. Must connect to infrastructure AT the conference
5. Must have fun!

### 2. CESMII Collaboration Requirements

Exact text from documentation:

> "Solutions should attempt to use a Smart Manufacturing Profile (SM Profile) by either:
> - **applying an SM Profile to the Virtual Factory UNS**, OR
> - **publishing an SM Profile to the Virtual Factory UNS**"

Key word: "should attempt" — not "must" but strongly recommended. Two valid approaches:
- **Apply:** Use existing profiles to structure/validate data from UNS
- **Publish:** Create and publish SM Profile-compliant data to UNS

### 3. Presentation Format (REVISED FROM EARLIER RESEARCH)

- **45 minutes total** on stage (not 30 as previously believed)
- 30-35 minutes for presenting solution
- 10-15 minutes for audience Q&A
- Two simultaneous stages — one presents while next sets up
- 15-minute break between sessions

### 4. Questions You Must Answer During Presentation

1. **What problem did you solve?**
2. **How did you solve it?**
3. **How long did it take to implement?**
4. **If a manufacturer wanted this solution, how much would it generally cost?**

### 5. Virtual Factory Details (Relevant to EdgeMind)

EdgeMind already connects to all three enterprises:

| Factory | Description | Topics | Simulation Window |
|---------|-------------|--------|-------------------|
| Enterprise A | Glass jar manufacturer | ~120 | 2 hours |
| Enterprise B | Multi-site beverage bottling | ~3,340 | 7 days |
| Enterprise C | Life sciences facility | (see separate doc) | TBD |

UNS update interval: 10 seconds across all factories.

### 6. Enterprise B Interesting Topics (CESMII Work Order Relevant)

The documentation identifies these topic categories for Enterprise B:
- `#workorder/` — Work order instruction and progress
- `#lotnumber/` — Lot number information
- `#item/` — Item information
- `#processdata/` — Various by equipment
- `#metric/` — Node's KPI information

**The `#workorder/` category is EXACTLY where CESMII WorkOrderV1 profiles fit.**

### 7. Data Endpoints

Multiple integration points available:
- MQTT (HiveMQ Broker) — primary
- MySQL Database — available
- OPC UA Server — available

### 8. Functional Specification Template

Sponsors complete a template covering:
- Problem Definition
- Solution Description (architecture, tech stack)
- Data Requirements (what topics consumed, what data published back)
- Integration Points (MQTT, MySQL, OPC)
- Testing and Validation
- Presentation Details

## IMPACT ON HYPOTHESES

### H1 (Native Consumer): STRENGTHENED
- Consuming SM Profile data from UNS is an officially recognized approach
- Enterprise B already has `#workorder/` topic category
- Applies to requirement: "applying an SM Profile to the Virtual Factory UNS"

### H2 (Bidirectional): NOW EFFECTIVELY REQUIRED
- **"Any new or created data and information must be published BACK to the UNS"** ← THIS IS A HARD REQUIREMENT
- Publishing SM Profile-compliant data back = satisfies both the UNS publish requirement AND the CESMII collaboration
- H2 is no longer "nice to have" — it's mandatory for full compliance
- Applies to requirement: "publishing an SM Profile to the Virtual Factory UNS"

### H4 (AI Interpreter): UNIQUE DIFFERENTIATOR
- The 4 presentation questions focus on: problem solved, how, time, cost
- AI-powered profile interpretation answers "what problem did you solve?" compellingly
- "We used AI to understand manufacturing data contracts and correlate work orders with real-time operations"
- No other vendor is likely combining CESMII + AI analysis

## Verdict

- [x] H2 is now REQUIRED, not optional — publishing back to UNS is a hard requirement
- [x] SM Profile implementation is "should attempt" (strongly recommended, not mandatory)
- [x] Presentation is 45 min (30-35 demo + 10-15 Q&A) — more time than expected
- [x] Enterprise B's `#workorder/` topic category aligns perfectly with WorkOrderV1

## Recommendations

1. **Reprioritize H2** — it's not optional, it's required by the conference rules
2. **Frame EdgeMind around the 4 presentation questions**
3. **Leverage Enterprise B's existing workorder topic structure**
4. **The AI differentiator (H4) directly answers "What problem did you solve?"**
