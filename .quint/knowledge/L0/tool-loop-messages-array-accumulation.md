---
scope: lib/ai/index.js lines 502-678, analyzeTreesWithClaude function
kind: system
content_hash: 5a026b71bad34fe81a9bf7db7627b44e
---

# Hypothesis: Tool Loop Messages Array Accumulation

In analyzeTreesWithClaude() (lib/ai/index.js lines 502-678), the messages array accumulates all tool call results during the loop (up to 9 iterations). Each iteration adds 2000+ tokens of assistant response plus 1000+ bytes of tool results. Can grow to 50KB+ per analysis. Fix: Summarize/compress intermediate results or limit retained context.

## Rationale
{"anomaly": "Tool-use loop accumulates 50KB+ per analysis run (every 2-15 min)", "approach": "Limit message history retention within tool loop or summarize intermediate results", "alternatives_rejected": ["Streaming responses (not supported by Bedrock Converse)", "External message store (overkill)"]}