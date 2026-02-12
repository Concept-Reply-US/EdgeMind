---
id: nova-micro-cheapest
type: hypothesis
created: 2026-02-12
problem: Switch tier analysis from Sonnet to Nova Lite for 50x cost reduction
status: L0
formality: 3
novelty: Conservative
complexity: Low
author: Claude (generated), Human (to review)
scope:
  applies_to: "callBedrockSingleShot tier analysis path (Tier 2 + Tier 3)"
  not_valid_for: "Interactive Q&A, multimodal analysis"
  scale: "~50 Bedrock calls/day, text-only analysis"
---

# Hypothesis: Use Nova Micro (text-only, cheapest) for tier analysis

## 1. The Method (Design-Time)

### Proposed Approach
Use Amazon Nova Micro (`us.amazon.nova-micro-v1:0`) instead of Nova Lite. Nova Micro is text-only (no image/video), 4x faster than Lite, and the absolute cheapest option. Since tier analysis only processes text (OEE numbers, equipment states, trend summaries), multimodal capabilities are unnecessary. Same implementation as H1 (env var swap + temperature fix) but with the smallest, fastest model.

### Rationale
The tier analysis prompts are structured text data (OEE percentages, equipment state lists, trend summaries). There's zero need for image or video processing. Nova Micro achieved the same MT-Bench median score as Nova Lite (8.0) for text tasks. At $0.035 input / $0.14 output per M tokens, it's the absolute floor for cost — roughly 85x cheaper than Sonnet on input. Benchmarks show it's competitive with GPT-4o mini and Gemini Flash.

### Implementation Steps
1. Same as H1: add `temperature: 0` to Nova `inferenceConfig`
2. Set `BEDROCK_TIER_MODEL_ID=us.amazon.nova-micro-v1:0`
3. Test structured JSON output quality
4. Verify token usage tracking

### Expected Capability
- 85x cheaper input ($0.035 vs $3.00/M)
- 107x cheaper output ($0.14 vs $15.00/M)
- 4x faster response times than Nova Lite
- Lower latency = faster tier analysis cycles
- Text-only is fine — tier prompts are all text

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | High | Same as H1 — env var + temperature fix |
| **Explanatory Power** | High | Maximum cost reduction, fastest responses |
| **Consistency** | Med | Smallest model = highest risk of quality degradation |
| **Falsifiability** | High | Test JSON output quality immediately |

**Plausibility Verdict:** PLAUSIBLE

### Assumptions to Verify
- [ ] Nova Micro accessible without Marketplace subscription
- [ ] Nova Micro produces structured JSON reliably with temperature=0
- [ ] Nova Micro handles complex factory analysis prompts (OEE trends, anomaly detection)
- [ ] Analysis quality is sufficient (summaries are coherent, not hallucinated)
- [ ] 128K context window is sufficient (same as Lite)

### Required Evidence
- [ ] **Internal Test:** Send sample tier analysis prompt to Nova Micro, check JSON quality
  - **Performer:** Developer
- [ ] **Internal Test:** Compare Nova Micro vs Nova Lite output quality on same prompts
  - **Performer:** Developer
- [ ] **Research:** Verify Nova Micro context window and structured output support
  - **Performer:** AI Agent

## Falsification Criteria
- If Nova Micro JSON output is malformed >30% of the time, not viable
- If analysis summaries are generic/unhelpful compared to Sonnet output, quality too low
- If Nova Micro can't handle the prompt length (prefetched tool data can be large)

## Estimated Effort
1-2 hours (same as H1, just different model ID)

## Weakest Link
Quality of analysis. Nova Micro is the smallest model in the lineup. For simple text tasks (summarization, classification) it's great, but factory trend analysis with anomaly detection may be too complex. Need head-to-head comparison.
