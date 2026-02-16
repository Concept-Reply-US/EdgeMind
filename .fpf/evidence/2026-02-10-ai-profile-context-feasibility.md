---
id: ai-profile-context-feasibility
type: external-research
source: web
created: 2026-02-10
hypothesis: .fpf/knowledge/L1/cesmii-ai-profile-interpreter-hypothesis.md
assumption_tested: "Claude can meaningfully interpret JSON-LD profile definitions; context budget is sufficient"
valid_until: 2026-08-10
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "EdgeMind's existing AI pipeline on Bedrock with domain context injection"
  our_context: "Same pipeline with profile schemas added"
  justification: "Extension of existing proven capability in same codebase"
sources:
  - url: internal://lib/ai/index.js
    title: "EdgeMind AI module — existing prompt architecture"
    type: internal-code
    accessed: 2026-02-10
    credibility: high
scope:
  applies_to: "Adding CESMII profile context to existing Claude analysis pipeline"
  not_valid_for: "AI systems without existing manufacturing domain context"
---

# Research: AI Profile Interpretation Feasibility

## Purpose
Assess whether Claude can meaningfully interpret SM Profile definitions and whether the context window has budget for profile schemas + work order data.

## Findings

### Context Window Budget Analysis

Current AI prompt (lib/ai/index.js:431) already includes:
1. Domain context per enterprise (~500 tokens)
2. Operator thresholds (~200 tokens)
3. Data source context / critical instructions (~300 tokens)
4. Previous insights for dedup (~200 tokens)
5. Historical RAG context (~300 tokens)
6. Trend data summary (~1000-2000 tokens)
7. Filter rules (~100 tokens)
8. Task instructions + output format (~800 tokens)

**Estimated current usage:** ~3,500-4,500 tokens per analysis call

**Profile schema addition:**
- WorkOrderV1.jsonld: ~2KB = ~500 tokens
- FeedIngredientV1.jsonld: ~1KB = ~250 tokens
- Work order summary (latest 5 orders): ~500 tokens
- Profile interpretation instructions: ~200 tokens

**Addition total:** ~1,450 tokens

**Total with profiles:** ~5,000-6,000 tokens — well within Bedrock Claude Sonnet's 200K context window.

### AI Interpretation Quality

Claude (Sonnet/Opus) has demonstrated strong capability with:
- JSON schema interpretation
- OPC UA type understanding (it knows what Int32, DateTime, UtcTime mean)
- Manufacturing domain knowledge (OEE, work orders, batch processing)
- Correlating structured data with time-series metrics

The key question is whether Claude can CORRELATE work orders with sensor data:
- "WorkOrder #100042 calls for 60 cases of Product A → requires ingredients A1 (10%), A2 (30%), A3 (60%) → Enterprise B's filler line is at 78% OEE → estimated throughput..."

This is within Claude's demonstrated reasoning capability for structured data + domain knowledge.

### Tiered Architecture Integration Points

The existing tier system provides natural injection points:
- **Tier 1 (delta detection, every 2 min):** Could detect new work orders as "meaningful changes"
- **Tier 2 (targeted AI, triggered by changes):** Perfect for work-order-specific analysis
- **Tier 3 (comprehensive summary, every 15 min):** Include work order status in summary

Work orders arriving every 10 seconds would trigger Tier 2 targeted analysis — this is the designed behavior.

## Verdict

- [x] Assumption **SUPPORTED** — Context budget has ~195K tokens of headroom
- [x] Profile schemas are small (~750 tokens combined) — negligible context cost
- [x] Existing tiered architecture supports work order event triggering
- [⚠] AI output quality needs empirical testing (internal test recommended)

## Gaps

- Haven't tested actual Claude output quality with work order + sensor correlation
- Don't know if the AI will produce genuinely useful insights vs. restating data
- Need to verify prompt engineering approach works in practice

## Recommendations

- Run a manual test with Bedrock: provide profile schema + sample work order + factory metrics
- Keep profile context injection simple — don't over-engineer the prompt
- Use Tier 2 (targeted analysis) as the work order interpretation trigger
