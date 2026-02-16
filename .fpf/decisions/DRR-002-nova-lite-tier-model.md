---
id: DRR-002
title: "Use Amazon Nova Lite as tier analysis model for 61x cost reduction"
status: ACCEPTED
date: 2026-02-12
decision_makers:
  - "Stefan Bekker — sole developer"
  - "Claude — analyst/advisor"
supersedes: none
hypothesis_selected: "nova-envvar-swap"
alternatives_rejected: ["converse-api-migration", "nova-micro-cheapest"]
---

# DRR-002: Use Amazon Nova Lite as Tier Analysis Model

## Executive Summary

**Decision:** Switch the tier analysis model (Tier 2 targeted + Tier 3 comprehensive) from Claude Sonnet to Amazon Nova Lite via env var + 2 small code fixes.

**Based on:** nova-envvar-swap hypothesis at L2 with R_eff = 1.00 (dev environment)

**Key evidence:** Live EC2 invocation — Nova Lite produced valid structured JSON for factory OEE analysis, no Marketplace subscription required, 61x cheaper per call.

## Context

### Problem Statement
EdgeMind's tier analysis uses Claude Sonnet ($3/$15 per M tokens) for routine OEE summaries and trend detection. With ~50 calls/day, this costs significantly more than necessary for what is essentially structured data summarization.

### Trigger
Cost optimization initiative (PR #51). Haiku 4.5 and Claude 3.5 Haiku both failed with Marketplace subscription errors. Need an accessible, cheap model for routine analysis.

### Constraints
- Must use models already accessible in the AWS account (no new Marketplace subscriptions)
- Cannot break interactive Q&A path (stays on Sonnet)
- Must be trivially reversible
- Solo developer + hackathon timeline

### Success Criteria
- Tier 2/3 analysis produces valid JSON insights with Nova Lite
- Cost per call drops from ~$0.0044 to ~$0.00007
- No regressions in 407-test suite
- Change is reversible via env var

## Decision

**We will:** Set `BEDROCK_TIER_MODEL_ID=us.amazon.nova-lite-v1:0` and add 2 code fixes:
1. `temperature: 0` in Nova `inferenceConfig` for reliable JSON
2. Token tracking handles both `input_tokens` (Claude) and `inputTokens` (Nova)

**We will NOT:**
- Migrate to Converse API (unnecessary complexity for this goal)
- Use Nova Micro (quality risk too high without testing)
- Change the interactive Q&A model (stays on Sonnet)

**Based on hypothesis:** `.fpf/knowledge/L2/nova-envvar-swap-hypothesis.md`

## Alternatives Considered

### Converse API Migration (converse-api-migration)
- **Status:** L0 (not tested)
- **Summary:** Replace all 5 InvokeModelCommand call sites with ConverseCommand for model-agnostic API
- **Why rejected:** Unnecessary scope. The existing Nova adapters already work for the tier path. Refactoring all 5 call sites adds regression risk for no additional benefit right now. Can revisit if we need to support more models in the future.

### Nova Micro (nova-micro-cheapest)
- **Status:** L0 (not tested)
- **Summary:** Use the smallest/cheapest Nova model (text-only, 85x cheaper)
- **Why rejected:** Higher quality risk without empirical testing. Nova Lite is already 61x cheaper than Sonnet — sufficient savings. Can downgrade to Micro later if Nova Lite quality is confirmed solid.

## Evidence Summary

### Supporting Evidence

| Claim | Evidence | Type | Congruence | R_eff |
|-------|----------|------|------------|-------|
| Nova accessible without Marketplace sub | evidence/2026-02-12-nova-lite-invocation.md | Internal | Direct | 1.00 |
| InvokeModelCommand works with Nova | evidence/2026-02-12-nova-lite-invocation.md | Internal | Direct | 1.00 |
| Valid JSON output (temp=0) | evidence/2026-02-12-nova-lite-invocation.md | Internal | Direct | 1.00 |
| Token fields are camelCase | evidence/2026-02-12-nova-lite-invocation.md | Internal | Direct | 1.00 |
| Existing adapters handle Nova format | Code analysis (deduction phase) | Internal | Direct | 1.00 |

### WLNK Calculation

```
R_eff = min(1.00, 1.00, 1.00, 1.00, 1.00) = 1.00
No external evidence — all internal, direct context.
```

### Evidence Gaps
- Production (ECS Fargate) IAM role not tested — Amazon-native model, low risk
- Only tested with 127-token prompt — production prompts are 2000+
- N=1 test — but trivially reversible if issues emerge

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Nova JSON parse failures on large prompts | Medium | Low (graceful fallback) | Monitor first few analyses; revert env var if >20% failures | Stefan |
| Fargate IAM doesn't have Nova access | Low | Low (revert to Sonnet) | Amazon-native model; revert env var | Stefan |
| Analysis quality too shallow | Medium | Low (routine analysis only) | Compare output quality in dev; revert if unacceptable | Stefan |
| Token budget silently broken | Low | Very Low (~$3/day max on Nova) | Code fix handles both field formats | Stefan |

## Validity Conditions

This decision remains valid **WHILE:**
- Nova Lite pricing stays at $0.06/$0.24 per M tokens
- Tier analysis remains structured text (no image/video needed)
- ~50 calls/day workload
- Interactive Q&A stays on Sonnet

**Re-evaluate IF:**
- Nova Lite JSON quality proves insufficient in production (>20% parse failures)
- Haiku 4.5 becomes subscribed in the AWS account (even cheaper with better quality)
- Tier analysis needs to handle images or multimodal data
- Call volume increases significantly (consider provisioned throughput)

## Implementation Notes

### Immediate Actions
1. Add `temperature: 0` to `inferenceConfig` in `buildBedrockPayload` Nova branch
2. Fix token tracking: `usage.input_tokens || usage.inputTokens || 0`
3. Update default `tierModelId` in `lib/config.js` to `us.amazon.nova-lite-v1:0`
4. Run test suite, commit, push to dev
5. Monitor first Tier 3 analysis cycle for valid output

### Follow-up Items
- [ ] Monitor Nova output quality for first 24 hours
- [ ] Verify Nova works on ECS Fargate when deploying to production
- [ ] Consider Nova Micro if Nova Lite quality is confirmed solid
- [ ] Update context.md AI entry to reflect Nova Lite for tier analysis

## Consequences

### Expected Positive Outcomes
- 61x cost reduction per tier analysis call
- Monthly tier analysis cost: ~$0.10 (vs ~$6.60 with Sonnet)
- No architecture changes, minimal code changes
- Trivially reversible

### Accepted Trade-offs
- Analysis quality may be slightly less nuanced than Claude Sonnet
- N=1 test sample — accepting that production will be the real test
- Token budget enforcement depends on code fix being correct

### Potential Negative Outcomes (Accepted Risks)
- Nova produces generic insights — Accepted because routine analysis, not customer-critical
- Parse failures on complex prompts — Accepted because graceful fallback exists

## Audit Trail

### Reasoning Cycle
- **Problem defined:** 2026-02-12
- **Hypotheses generated:** 3 on 2026-02-12
- **Deduction completed:** 2026-02-12 — 1 passed (nova-envvar-swap), 2 not checked (user selection)
- **Induction completed:** 2026-02-12 — 1 evidence file, 4 assumptions confirmed
- **Audit completed:** 2026-02-12 — 0 blockers, 3 warnings, PROCEED recommendation
- **Decision finalized:** 2026-02-12

### Key Decisions During Cycle
- User selected H1 (nova-envvar-swap) over H2 and H3 for deduction
- Deduction found token tracking field name mismatch (camelCase vs snake_case)
- Live EC2 test confirmed all assumptions in single invocation

## References

- **Session archive:** `.fpf/sessions/2026-02-12-nova-lite-tier-model.md`
- **Winning hypothesis:** `.fpf/knowledge/L2/nova-envvar-swap-hypothesis.md`
- **Evidence files:** `.fpf/evidence/2026-02-12-nova-lite-invocation.md`
- **Related DRRs:** DRR-001 (CESMII Bidirectional)
