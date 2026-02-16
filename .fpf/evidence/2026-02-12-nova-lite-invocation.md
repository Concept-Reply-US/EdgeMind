---
id: nova-lite-invocation
type: internal-test
source: internal
created: 2026-02-12
hypothesis: ../knowledge/L1/nova-envvar-swap-hypothesis.md
assumption_tested: "Nova Lite accessible via InvokeModelCommand + produces valid JSON + token field names"
valid_until: 2026-08-12
decay_action: refresh
scope:
  applies_to: "EdgeMind tier analysis via InvokeModelCommand on EC2 dev instance"
  not_valid_for: "ECS Fargate (different IAM role), other AWS accounts"
  environment: "EC2 i-0f0ecb162bccf8ca8, Docker container edgemind-backend, us-east-1"
---

# Test: Nova Lite InvokeModelCommand with Factory Analysis Prompt

## Purpose
Verify three assumptions simultaneously:
1. Nova Lite is accessible without Marketplace subscription (no auth error)
2. InvokeModelCommand works with Nova (not Converse-only)
3. Nova Lite produces valid JSON for factory OEE analysis prompts with temperature=0
4. (Bonus) Capture exact response field names for token tracking

## Hypothesis Reference
- **File:** `.fpf/knowledge/L1/nova-envvar-swap-hypothesis.md`
- **Assumptions tested:** A1 (Marketplace access), A3 (JSON output quality), A4 (InvokeModel works)
- **Falsification criterion:** Same Marketplace error as Haiku = hypothesis dead

## Test Environment
- **Date:** 2026-02-12
- **Instance:** EC2 i-0f0ecb162bccf8ca8
- **Container:** edgemind-backend (Docker)
- **Model:** us.amazon.nova-lite-v1:0
- **SDK:** @aws-sdk/client-bedrock-runtime (from app's node_modules)
- **Region:** us-east-1

## Method
1. Wrote Node.js test script using the exact same SDK and InvokeModelCommand pattern as `callBedrockSingleShot`
2. Used a simplified but representative factory analysis prompt
3. Set `temperature: 0` per AWS docs for structured output
4. Ran inside the Docker container to use the same IAM credentials

```javascript
const cmd = new InvokeModelCommand({
  modelId: "us.amazon.nova-lite-v1:0",
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify(payload) // Nova format: messages + inferenceConfig
});
```

## Raw Results

```json
{
  "output": {
    "message": {
      "content": [
        {
          "text": "{\n  \"summary\": \"Enterprise A has a lower Overall Equipment Effectiveness (OEE) of 49.1% compared to Enterprise B's 63.5%...\",\n  \"severity\": \"medium\",\n  \"confidence\": 0.85,\n  \"trends\": [\n    \"Enterprise A's OEE is below industry average.\",\n    \"Enterprise B's OEE is above industry average.\",\n    \"Enterprise A's performance is at 100% but is hindered by availability and quality.\",\n    \"Enterprise B's availability and quality are at 100% but performance is lower.\"\n  ],\n  \"anomalies\": [\n    \"Enterprise A's OEE is significantly lower than Enterprise B's.\",\n    \"Enterprise A's quality is lower than Enterprise B's despite having a higher availability.\"\n  ],\n  \"recommendations\": [\n    \"Investigate the reasons for lower availability and quality at Enterprise A.\",\n    \"Analyze the performance metrics at Enterprise B to understand the lower performance despite high availability and quality.\",\n    \"Consider sharing best practices between the two enterprises to improve overall performance.\"\n  ]\n}"
        }
      ],
      "role": "assistant"
    }
  },
  "stopReason": "end_turn",
  "usage": {
    "inputTokens": 127,
    "outputTokens": 267,
    "totalTokens": 394,
    "cacheReadInputTokenCount": 0,
    "cacheWriteInputTokenCount": 0
  }
}
```

## Interpretation

### Assumption 1: Marketplace Access — CONFIRMED
No authentication or subscription error. Nova Lite invoked successfully. This is an Amazon-native model, not a third-party marketplace model — no subscription step required.

### Assumption 2: InvokeModelCommand Works — CONFIRMED
Used the exact same `InvokeModelCommand` pattern as the codebase. No need for Converse API.

### Assumption 3: JSON Output Quality — CONFIRMED
Nova Lite produced valid, well-structured JSON with temperature=0:
- All requested fields present (summary, severity, confidence, trends, anomalies, recommendations)
- Reasonable analysis content (identified OEE gap, availability issues, cross-enterprise comparison)
- `confidence: 0.85` — appropriate for the data given
- `severity: "medium"` — reasonable assessment
- No preamble text, no markdown fences — clean JSON

### Assumption 4 (Bonus): Token Field Names — CONFIRMED
Nova uses camelCase:
- `usage.inputTokens` (NOT `input_tokens`)
- `usage.outputTokens` (NOT `output_tokens`)
- `usage.totalTokens` (bonus field — Claude doesn't have this)
- `usage.cacheReadInputTokenCount` (prompt caching field)
- `usage.cacheWriteInputTokenCount` (prompt caching field)

### Response Structure — CONFIRMED
- `output.message.content[0].text` — matches `extractResponseContent` Nova path
- `stopReason: "end_turn"` — same semantic as Claude's `stop_reason`
- Content is `[{ text: "..." }]` — matches `extractTextContent` handler

### Cost Analysis
- 127 input tokens + 267 output tokens = 394 total
- Cost: (127 × $0.00006) + (267 × $0.00024) = $0.0000076 + $0.0000641 = **$0.0000717**
- Equivalent Sonnet cost: (127 × $0.003) + (267 × $0.015) = $0.00038 + $0.004 = **$0.00439**
- **Savings: 61x cheaper per call**

## Scope of Validity

**This evidence applies when:**
- Running on EC2 dev instance with current IAM role
- Using `us.amazon.nova-lite-v1:0` model ID
- Sending factory OEE analysis prompts with temperature=0

**This evidence does NOT apply when:**
- Different AWS account or IAM role (e.g., ECS Fargate production)
- Much larger prompts (tested with 127 input tokens; production prompts may be 2000+)
- Complex multi-turn conversations (only tested single-shot)

**Re-test triggers:**
- AWS changes Nova Lite access model
- Moving to production (ECS Fargate) — verify IAM role has access
- Prompt length increases significantly

## Verdict

- [x] Assumption A1 **CONFIRMED** — No Marketplace subscription needed
- [x] Assumption A3 **CONFIRMED** — Valid JSON with all expected fields
- [x] Assumption A4 **CONFIRMED** — InvokeModelCommand works with Nova
- [x] Token fields **CONFIRMED** — camelCase (inputTokens/outputTokens), need code fix

## Validity Window

**Valid until:** 2026-08-12
**Recommended refresh:** 6 months or on IAM/infra changes
**Decay action:** refresh
