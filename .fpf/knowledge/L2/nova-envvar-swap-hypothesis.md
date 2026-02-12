---
id: nova-envvar-swap
type: hypothesis
created: 2026-02-12
problem: Switch tier analysis from Sonnet to Nova Lite for 50x cost reduction
status: L2
decided_in: DRR-002
decision_date: 2026-02-12
deduction_passed: 2026-02-12
induction_passed: 2026-02-12
evidence:
  - ../evidence/2026-02-12-nova-lite-invocation.md
evidence_summary: |
  Verified through live EC2 test. Nova Lite invoked successfully via InvokeModelCommand.
  No Marketplace subscription needed (Amazon-native model). Produced valid JSON with all
  expected fields (summary, severity, confidence, trends, anomalies, recommendations).
  Token tracking fields confirmed as camelCase (inputTokens/outputTokens).
  Cost per call: $0.00007 vs $0.0044 for Sonnet (61x cheaper).
validity_conditions:
  - EC2 dev instance IAM role has Bedrock access
  - Using us.amazon.nova-lite-v1:0 model ID
  - Re-verify on ECS Fargate production (different IAM role)
formality: 3
novelty: Minimal
complexity: Low
author: Claude (generated), Human (to review)
scope:
  applies_to: "callBedrockSingleShot tier analysis path (Tier 2 + Tier 3)"
  not_valid_for: "Interactive Q&A (COO agent), legacy tool-loop paths"
  scale: "~50 Bedrock calls/day for routine analysis"
---

# Hypothesis: Near-zero code change — existing Nova adapters already work

## 1. The Method (Design-Time)

### Proposed Approach
The codebase ALREADY has Nova model adapters: `isNovaModel()`, `toNovaContent()`, `buildBedrockPayload()` Nova branch, and `extractResponseContent()` Nova path. The `callBedrockSingleShot` function passes `modelId: tierModelId` to `buildBedrockPayload`, which correctly detects Nova and formats the payload. Code changes needed:
1. Add `temperature: 0` to Nova `inferenceConfig`
2. Fix token tracking to handle Nova camelCase fields

### Implementation Steps
1. Add `temperature: 0` to `inferenceConfig` in `buildBedrockPayload` Nova branch
2. Fix token tracking in `callBedrockSingleShot` to read both `input_tokens` (Claude) and `inputTokens` (Nova)
3. Set `BEDROCK_TIER_MODEL_ID=us.amazon.nova-lite-v1:0` in environment
4. Deploy and verify tier analysis produces valid JSON insights

### Expected Capability
- 61x cheaper per call (verified: $0.00007 vs $0.0044)
- Routine Tier 2/3 analysis at pennies/day
- No architecture changes needed
- ~8 lines of code change total

## 2. Verification Results

### Assumptions — All Verified

| Assumption | Result | Evidence |
|------------|--------|----------|
| Nova accessible without Marketplace sub | CONFIRMED | Invoked successfully from EC2, no auth error |
| InvokeModelCommand works with Nova | CONFIRMED | Same SDK pattern as codebase |
| Nova produces valid JSON (temp=0) | CONFIRMED | All fields present, clean structure, no preamble |
| Token field names differ | CONFIRMED | camelCase: inputTokens/outputTokens/totalTokens |
| extractResponseContent handles Nova | CONFIRMED | output.message.content path works |

### Falsification Status
- [x] No falsification criteria triggered — Hypothesis verified

### Test Data
- Input: 127 tokens, Output: 267 tokens, Total: 394 tokens
- Response: Valid JSON with summary, severity (medium), confidence (0.85), trends (4), anomalies (2), recommendations (3)
- stopReason: "end_turn"

## Estimated Effort
1-2 hours (mostly testing, ~8 lines of code)

## Remaining Risk
Production (ECS Fargate) uses a different IAM role — need to verify Nova access there too.
