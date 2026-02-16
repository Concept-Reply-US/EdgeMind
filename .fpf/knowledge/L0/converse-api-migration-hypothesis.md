---
id: converse-api-migration
type: hypothesis
created: 2026-02-12
problem: Switch tier analysis from Sonnet to Nova Lite for 50x cost reduction
status: L0
formality: 4
novelty: Novel
complexity: Medium
author: Claude (generated), Human (to review)
scope:
  applies_to: "All Bedrock invocations (tier analysis, interactive Q&A, legacy paths)"
  not_valid_for: "Embedding calls (Titan uses separate API)"
  scale: "All 5 InvokeModelCommand call sites"
---

# Hypothesis: Migrate to Bedrock Converse API for model-agnostic calls

## 1. The Method (Design-Time)

### Proposed Approach
Replace all 5 `InvokeModelCommand` call sites with `ConverseCommand` from `@aws-sdk/client-bedrock-runtime`. The Converse API provides a unified request/response format across ALL Bedrock models — no more model-specific format adapters. This eliminates `isNovaModel()`, `toNovaContent()`, `formatToolResult()`, `formatTextBlock()`, and the entire dual-format branching. Any model can be swapped in via config with zero code changes.

### Rationale
The current codebase has ~80 lines of model-format adapter code that branches on `isNovaModel()`. This creates a maintenance burden and has known bugs (formatToolResult/formatTextBlock hardcode the primary model ID). The Converse API was designed to solve exactly this problem — one API format, any model. After migration, switching between Claude, Nova, Llama, or any future model is purely a config change.

### Implementation Steps
1. Import `ConverseCommand` from `@aws-sdk/client-bedrock-runtime` (already in dependencies)
2. Create `callBedrock(modelId, messages, options)` using Converse API format
3. Replace all 5 `InvokeModelCommand` call sites:
   - `callBedrockSingleShot` (tier analysis)
   - `analyzeTreesWithClaude` tool loop (legacy)
   - `callClaudeWithPrompt` tool loop (legacy)
   - `askClaude` interactive Q&A
4. Remove all model-format adapter functions (isNovaModel, toNovaContent, etc.)
5. Update response parsing to Converse API format
6. Set tier model to Nova Lite via env var

### Expected Capability
- Model-agnostic: swap ANY model via config, zero code changes
- Eliminates ~80 lines of adapter code and known bugs
- Future-proof: Nova 2, Llama, Mistral all work automatically
- Same 50x cost savings when using Nova Lite

## 2. The Validation (Run-Time)

### Plausibility Assessment

| Filter | Score | Justification |
|--------|-------|---------------|
| **Simplicity** | Low | Touches all 5 Bedrock call sites, larger refactor |
| **Explanatory Power** | High | Solves cost + eliminates adapter bugs + future-proofs |
| **Consistency** | High | Converse API is AWS's recommended approach |
| **Falsifiability** | High | Tests will immediately show if calls work |

**Plausibility Verdict:** PLAUSIBLE

### Assumptions to Verify
- [ ] Converse API supports tool_use with same capabilities as InvokeModel for Claude
- [ ] Converse API response format provides token usage metrics
- [ ] No behavioral differences in Claude responses between InvokeModel and Converse
- [ ] Converse API works with cross-region inference profiles (`us.amazon.nova-lite-v1:0`)
- [ ] Tool loop pattern (multi-turn with tool results) works via Converse API

### Required Evidence
- [ ] **Research:** Converse API JS SDK documentation for ConverseCommand
  - **Performer:** AI Agent
- [ ] **Internal Test:** Replace one call site (callBedrockSingleShot) and verify
  - **Performer:** Developer
- [ ] **Internal Test:** Run full test suite after migration
  - **Performer:** CI Pipeline

## Falsification Criteria
- If Converse API doesn't support tool_use loops the way InvokeModel does, this fails
- If response format differences break JSON parsing, this needs rework
- If migration introduces regressions in the 407-test suite

## Estimated Effort
4-6 hours (medium refactor, needs careful testing of all paths)

## Weakest Link
Risk of regressions across all 5 call paths during migration. The tool-loop paths (legacy `analyzeTreesWithClaude` and `callClaudeWithPrompt`) are complex multi-turn conversations that need careful Converse API mapping.
