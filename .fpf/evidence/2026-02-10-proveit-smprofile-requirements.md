---
id: proveit-smprofile-requirements
type: external-research
source: web
created: 2026-02-10
hypothesis: .fpf/knowledge/L1/cesmii-bidirectional-hypothesis.md
assumption_tested: "Custom SM Profiles are acceptable for the hackathon"
valid_until: 2026-03-01
decay_action: deprecate
congruence:
  level: high
  penalty: 0.00
  source_context: "Official CESMII ProveIt SM Profiles guide for conference vendors"
  our_context: "EdgeMind is a ProveIt conference vendor implementing SM Profiles"
  justification: "Direct match — this IS the official requirement document for our exact use case"
sources:
  - url: https://github.com/cesmii/ProveIt-SMProfiles
    title: "CESMII ProveIt SM Profiles — Official Vendor Requirements"
    type: official-docs
    accessed: 2026-02-10
    credibility: high
  - url: https://www.hivemq.com/blog/insights-proveit-2025-unified-namespace-solutions-in-action/
    title: "HiveMQ — Insights from ProveIt! 2025"
    type: tech-blog
    accessed: 2026-02-10
    credibility: medium
  - url: https://www.proveitconference.com/
    title: "ProveIt! Conference Official Website"
    type: official-docs
    accessed: 2026-02-10
    credibility: high
scope:
  applies_to: "All ProveIt 2026 vendor implementations, including EdgeMind"
  not_valid_for: "Non-ProveIt implementations or pre-2026 conferences"
---

# Research: ProveIt SM Profile Requirements and Custom Profile Acceptance

## Purpose
Determine: (1) What exactly does ProveIt 2026 require for SM Profile implementation? (2) Are custom profiles acceptable? (3) What format/method is expected?

## Hypothesis Reference
- **File:** `.fpf/knowledge/L1/cesmii-bidirectional-hypothesis.md`
- **Assumption tested:** Custom SM Profiles are acceptable for the hackathon
- **Also relevant to:** H1 (what's required) and H4 (what differentiation is valued)

## Congruence Assessment

**Source context:** Official CESMII requirements for ProveIt 2026 vendors
**Our context:** We ARE a ProveIt 2026 vendor

| Dimension | Match | Notes |
|-----------|-------|-------|
| Technology | ✓ | Same conference, same UNS |
| Scale | ✓ | Same virtual factory |
| Use Case | ✓ | Identical — we are the target audience |
| Environment | ✓ | Same MQTT broker infrastructure |

**Congruence Level:** High
**Penalty:** 0.00
**R_eff:** 1.00

## Findings

### Source 1: CESMII ProveIt-SMProfiles (Official Requirements)

**URL:** https://github.com/cesmii/ProveIt-SMProfiles
**Type:** official-docs
**Credibility:** High
**Accessed:** 2026-02-10

**Key points:**

1. **SM Profiles are MANDATORY for ProveIt 2026** — "Implementing an SMProfile is mandatory for vendors participating in ProveIt starting in 2026"

2. **TWO valid compliance pathways:**
   - **Option 1:** Adopt published SM Profiles (e.g., VDMA Machine Basic Building Blocks)
   - **Option 2:** Define CUSTOM profiles for vendor-specific data

3. **Custom profiles are EXPLICITLY encouraged** — "Create proprietary information models for vendor-specific data" with requirement to "share the profile structure independently from actual data movement"

4. **Three methods for publishing custom profiles:**
   - Method 1: CESMII Profile Designer (formal, published to marketplace)
   - Method 2: JSON Schema on GitHub (simpler, open-source)
   - Method 3: Hybrid with Nodesets + GitHub hosting

5. **Format flexibility is CRITICAL:** "you do not have to use OPCUA in their implementation" — SM Profiles work across MQTT, Ignition UDTs, FactoryTalk, DataOps platforms

6. **"Lego blocks" metaphor** — vendors can standardize specific payload sections while leaving others unstandardized

7. **Payloads must reference their governing profile through metadata** to enable downstream validation

### Source 2: HiveMQ — ProveIt 2025 Insights

**URL:** https://www.hivemq.com/blog/insights-proveit-2025-unified-namespace-solutions-in-action/
**Type:** tech-blog (reputable)
**Credibility:** Medium
**Accessed:** 2026-02-10

**Key points:**
- Vendors receive functional specifications 16 weeks before event
- Dry runs 4 weeks prior
- Demo format: 30 minutes demo + 15 minutes Q&A
- CESMII's Matthew Parris joins ProveIt 2026 technical steering committee
- HiveMQ is the enterprise MQTT broker

### Source 3: eukodyne/cesmii Config

**URL:** https://raw.githubusercontent.com/eukodyne/cesmii/main/config.json
**Type:** official-docs (reference implementation)
**Credibility:** High
**Accessed:** 2026-02-10

**Key points:**
- Default MQTT publish topic: `Enterprise B/your-username/cesmii/WorkOrder`
- Topic follows UNS structure: Enterprise/Username/Namespace/DataType
- Publisher sends retained messages every 10 seconds
- Broker target is ProveIt's internal network (192.168.10.8:1883)

## Synthesis

**Custom profiles are OFFICIALLY SUPPORTED and ENCOURAGED.** The ProveIt requirements explicitly list "Define Custom Profiles" as Option 2, with three valid publication methods. The JSON Schema on GitHub method (Method 2) is the most practical for our timeline — no Profile Designer registration needed.

**For H2 (Bidirectional):** This is a green light. Publishing EdgeMind's own SM Profile-compliant data (FactoryInsightV1, OEEReportV1) as custom profiles hosted on GitHub is an officially sanctioned approach.

**For H1 (Consumer):** The eukodyne publisher uses topic pattern `Enterprise B/{username}/cesmii/WorkOrder`. Our `#` wildcard subscription WILL catch these. Topic follows the UNS hierarchy that EdgeMind already parses (Enterprise/Site/Area/...).

**For H4 (AI Interpreter):** The "lego blocks" approach means profile data can be partially standardized. AI can interpret the standardized parts while providing value-add analysis of the operational context.

**Demo format note:** 30 minutes + 15 min Q&A means we need a polished, working demo — not just code. Frontend visualization matters.

## Verdict

- [x] Assumption **SUPPORTED** — Custom SM Profiles are officially acceptable via Method 2 (JSON Schema on GitHub)
- [x] SM Profile implementation is MANDATORY for ProveIt 2026 — not optional
- [x] Format flexibility allows JSON-based approach without OPC UA server

## Gaps

- Specific scoring rubric or competitive evaluation criteria not publicly available
- Don't know what other vendors are implementing (competitive landscape)
- Dry run timeline (4 weeks before event) — may affect when we need code complete

## Recommendations

- Use Method 2 (JSON Schema on GitHub) for custom profiles — fastest path
- Ensure payloads include `profileDefinition` reference to hosted profile
- Frontend demo must be polished — 30-minute live demo format rewards visual impact
