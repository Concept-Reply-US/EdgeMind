---
id: cesmii-validator-portability
type: external-research
source: web
created: 2026-02-10
hypothesis: .fpf/knowledge/L1/cesmii-native-consumer-hypothesis.md
assumption_tested: "OPC UA type validation can be implemented in JS without heavy dependencies"
valid_until: 2026-08-10
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "Same eukodyne/cesmii repo, Python validator for same WorkOrderV1 profile"
  our_context: "Node.js implementation consuming same profile format"
  justification: "Same profiles, same types, same validation logic — only language differs"
sources:
  - url: https://github.com/eukodyne/cesmii/tree/main/cesmii-profile-validator
    title: CESMII Profile Validator Library
    type: official-docs
    accessed: 2026-02-10
    credibility: high
  - url: https://github.com/digitalbazaar/jsonld.js
    title: jsonld.js - JSON-LD Processor for JavaScript
    type: official-docs
    accessed: 2026-02-10
    credibility: high
scope:
  applies_to: "Validating WorkOrderV1 and FeedIngredientV1 payloads in Node.js"
  not_valid_for: "Full JSON-LD RDF processing or OPC UA server implementation"
---

# Research: CESMII Validator Portability to Node.js

## Purpose
Determine if the Python CESMII profile validator can be reasonably ported to Node.js without heavy dependencies.

## Hypothesis Reference
- **File:** `.fpf/knowledge/L1/cesmii-native-consumer-hypothesis.md`
- **Assumption tested:** OPC UA type validation (Int32, Int64, Double, DateTime, etc.) can be implemented in JS without heavy dependencies

## Congruence Assessment

**Source context:** Python validator validating same WorkOrderV1/FeedIngredientV1 profiles
**Our context:** Node.js validator for the same profiles from the same MQTT broker

| Dimension | Match | Notes |
|-----------|-------|-------|
| Technology | ⚠ | Python → Node.js (but validation logic is language-agnostic) |
| Scale | ✓ | Same volume — single factory broker |
| Use Case | ✓ | Identical — validate SM Profile payloads |
| Environment | ✓ | Same MQTT broker, same profiles |

**Congruence Level:** High
**Penalty:** 0.00
**R_eff:** 1.00

## Findings

### Source 1: eukodyne/cesmii Profile Validator

**URL:** https://github.com/eukodyne/cesmii/tree/main/cesmii-profile-validator
**Type:** official-docs (reference implementation)
**Credibility:** High
**Accessed:** 2026-02-10

**Key points:**
- Validator is "moderate complexity" — primarily type checking and range validation
- Supports 10 OPC UA types: Boolean, Int16/32/64, UInt16/32/64, Float/Double, String, UtcTime, Guid, TimeZoneDataType
- Validation is straightforward: JSON parsing, type checking, regex for timestamps/UUIDs, recursive traversal
- **"No blocking factors" for Node.js port** — no Python-specific libraries, no system calls
- Estimated ~500-800 lines of JavaScript
- API pattern: load_profile() → validate_payload() → result with errors

**Relevant detail:** The Python validator loads profiles from .jsonld files, builds a type lookup dictionary, then validates each field. This is a simple map-and-check pattern that translates directly to JavaScript.

### Source 2: jsonld.js

**URL:** https://github.com/digitalbazaar/jsonld.js
**Type:** official-docs (library)
**Credibility:** High
**Accessed:** 2026-02-10

**Key points:**
- Full JSON-LD processor: compact, expand, flatten, frame, canonize
- Lightweight with minimal dependencies
- **NOT a validator** — it processes/transforms JSON-LD, doesn't validate against schemas
- Useful for expanding profile documents but NOT required for SM Profile validation

**Conclusion:** We DON'T need jsonld.js for validation. The eukodyne validator doesn't use any RDF/JSON-LD processing library either — it treats the .jsonld file as plain JSON and reads the `cesmii:attributes` section. Our Node.js port can do the same.

## Synthesis

The validator port is HIGHLY FEASIBLE:
1. No heavy dependencies needed — just native JSON, typeof, and regex
2. OPC UA types map cleanly to JavaScript primitives (Number, String, Boolean)
3. Integer range checking (Int16: -32768 to 32767, etc.) is trivial in JS
4. DateTime/UtcTime validation is regex-based (ISO 8601)
5. Nested profile support is simple recursive descent
6. Estimated effort: 4-6 hours for a clean port

## Verdict

- [x] Assumption **SUPPORTED** by external evidence (congruence: high)

## Gaps

- We haven't verified the exact .jsonld schema format parsing — need to test with actual profile files
- JavaScript's Number type has precision limits for Int64 (BigInt may be needed for values > 2^53)

## Recommendations

- Port the validator to Node.js — the logic is straightforward
- Use BigInt for Int64/UInt64 validation if strict range checking needed
- Skip jsonld.js entirely — treat .jsonld files as plain JSON
