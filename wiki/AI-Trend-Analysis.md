# AI Trend Analysis

EdgeMind uses Claude AI to continuously monitor factory performance, detect anomalies, and deliver actionable recommendations to operators in real time.

---

## Table of Contents

- [Overview](#overview)
- [How the Analysis Works](#how-the-analysis-works)
  - [The Agentic Loop](#the-agentic-loop)
  - [Domain Context by Enterprise](#domain-context-by-enterprise)
  - [Operator-Defined Thresholds](#operator-defined-thresholds)
  - [Deduplication](#deduplication)
  - [Investigative Tools](#investigative-tools)
- [AI Output Structure](#ai-output-structure)
  - [Full JSON Schema](#full-json-schema)
  - [Field Reference](#field-reference)
- [Dashboard Display](#dashboard-display)
  - [Insight Cards](#insight-cards)
  - [Severity Levels](#severity-levels)
  - [Enterprise Filtering](#enterprise-filtering)
  - [Anomaly Detail Modal](#anomaly-detail-modal)
- [Interactive Q&A](#interactive-qa)
- [Configuration](#configuration)
- [See Also](#see-also)

---

## Overview

Every 30 seconds, EdgeMind runs an **agentic analysis loop** that:

1. Queries a **5-minute rolling window** of factory metrics from InfluxDB (aggregated into 1-minute intervals).
2. Applies **domain-specific context** for each enterprise (industry type, safe operating ranges, waste thresholds).
3. Sends the summarized data to **Claude AI via AWS Bedrock** for trend analysis.
4. Claude uses **investigative tools** to drill into root causes (OEE breakdowns, equipment states, batch status).
5. Returns a structured JSON insight that the dashboard renders as color-coded cards.

The system analyzes all three enterprises simultaneously: Enterprise A, Enterprise B, and Enterprise C. Each analysis cycle covers up to 30 grouped metric summaries and can make up to 9 tool calls (3 per enterprise) to investigate root causes before delivering findings.

---

## How the Analysis Works

### The Agentic Loop

The analysis loop runs on a fixed interval. On startup, EdgeMind waits 15 seconds for initial data to accumulate, then runs the first analysis. After that, the loop fires every 30 seconds.

Each cycle follows this sequence:

```
InfluxDB (5-min window, 1-min aggregates)
        |
        v
  Summarize by measurement
  (group, calculate avg + % change)
        |
        v
  Build domain context per enterprise
        |
        v
  Include operator thresholds + previous insights
        |
        v
  Send to Claude (AWS Bedrock)
        |
        v
  Claude calls investigative tools (up to 9 calls)
        |
        v
  Claude returns structured JSON
        |
        v
  Broadcast via WebSocket to all connected dashboards
```

The InfluxDB query retrieves all measurements where the field is `value` and the value is greater than zero, grouped by measurement, enterprise, site, and area. The summarizer calculates the average value and percent change over the window for up to 30 metric groups.

### Domain Context by Enterprise

Claude receives industry-specific knowledge for each enterprise present in the current data. This shapes how it interprets metrics and what thresholds it applies.

**Enterprise A -- Glass Manufacturing (Discrete)**

| Concern | Details |
|---|---|
| Industry | Glass manufacturing |
| Critical Metrics | Temperature, gob weight, defect count |
| Key Concerns | Thermal shock, crown temperature, refractory wear |
| Furnace Temp Range | 2,600-2,800 F (critical) |
| Waste Threshold | Warning: >10 defects/hr, Critical: >25 defects/hr |
| Waste Metrics | `OEE_Waste`, `Production_DefectCHK`, `Production_DefectDIM`, `Production_DefectSED`, `Production_RejectCount` |

**Enterprise B -- Beverage Bottling (Sparkplug B Protocol)**

| Concern | Details |
|---|---|
| Industry | Beverage bottling |
| Critical Metrics | Count infeed, count outfeed, count defect, OEE |
| Key Concerns | Line efficiency, changeover time, reject rate |
| Reject Rate Max | 2% (warning at 1.5%) |
| Waste Threshold | Warning: >50 defects/hr, Critical: >100 defects/hr |
| Waste Metrics | `count_defect`, `input_countdefect`, `workorder_quantitydefect` |

**Enterprise C -- Bioprocessing / Pharma (ISA-88 Batch Control)**

| Concern | Details |
|---|---|
| Industry | Bioprocessing / Pharma |
| Batch Control | ISA-88 |
| Equipment | CHR01 (chromatography), SUB250 (bioreactor), SUM500 (mixer), TFF300 (filtration) |
| Key Concerns | Contamination, batch deviation, sterility, phase timeout |
| pH Range | 6.8-7.4 (critical) |
| Cleanroom PM2.5 | <5 good, 5-10 warning, >10 critical (micrograms per cubic meter) |
| Cleanroom Humidity | 40-60% |
| Cleanroom Temp | 18-25 C |
| Waste Threshold | Warning: >5 L, Critical: >15 L |

Enterprise C is analyzed differently from A and B. Instead of OEE metrics, Claude queries batch status (equipment states, phases, batch IDs, recipes) and cleanroom environmental data.

### Operator-Defined Thresholds

Operators can set business-calibrated thresholds that override generic industry benchmarks. Claude uses these thresholds to decide what counts as an anomaly:

| Threshold | Description |
|---|---|
| OEE Baseline | Below this value is concerning (default varies by operator) |
| OEE World Class | Above this value is excellent |
| Availability Minimum | Below this triggers a critical alert |
| Defect Rate Warning | Above this triggers a warning |
| Defect Rate Critical | Above this triggers a critical alert |

Operators can also define **custom anomaly filter rules** (up to 10) that modify Claude's detection behavior. For example, you might add a rule like "Ignore temperature fluctuations below 5% during shift changeover" and Claude will incorporate that into its analysis.

### Deduplication

EdgeMind prevents alert fatigue by passing the last 3 insights back to Claude as context. Claude is instructed to:

- **Not repeat** anomalies that were already reported unless they have **worsened**.
- **Briefly acknowledge** persisting issues (e.g., "Enterprise B availability remains at 72%") instead of re-alerting.
- Only report **new anomalies** or **significantly worsening trends**.

### Investigative Tools

Claude does not just summarize numbers. It uses tools to investigate root causes before reporting. Each analysis cycle allows up to **9 tool calls** (typically 3 per enterprise).

| Tool | Purpose | When Claude Uses It |
|---|---|---|
| `get_oee_breakdown` | Returns OEE components (Availability, Performance, Quality) for an enterprise | When OEE is low -- determines which component is the bottleneck |
| `get_equipment_states` | Lists all equipment with current state (DOWN, IDLE, RUNNING) | When availability is low -- identifies which machines are down |
| `get_downtime_analysis` | Aggregates unplanned downtime, idle time, and defect counts over 24 hours | When quality is low or defects are high |
| `get_batch_status` | Returns ISA-88 batch data: equipment states, phases, batch IDs, recipes, cleanroom conditions | Used for Enterprise C instead of OEE tools |

This means Claude reports findings like:

> "Enterprise B availability is 72% due to 4.2 hours of unplanned downtime on the Filler line, which is currently in DOWN state."

Instead of simply restating:

> "Enterprise B availability is 72%."

---

## AI Output Structure

### Full JSON Schema

Each analysis cycle produces a structured JSON object. Here is an example of what Claude returns:

```json
{
  "summary": "All three enterprises operating within normal parameters. Enterprise A glass furnace stable at 2,710F. Enterprise B filler line recovered from brief idle period, now running at 98% availability. Enterprise C SUB250 bioreactor in PRODUCTION phase with pH at 7.1.",
  "trends": [
    {
      "metric": "furnace_temperature",
      "direction": "stable",
      "change_percent": 0.2
    },
    {
      "metric": "filler_countoutfeed",
      "direction": "rising",
      "change_percent": 3.5
    }
  ],
  "anomalies": [
    {
      "description": "Enterprise B reject rate approaching warning threshold",
      "reasoning": "Reject rate at 1.4% is approaching the 1.5% warning threshold. Labeler accuracy has dropped from 99.5% to 98.8% over the last 5 minutes, suggesting label alignment drift.",
      "metric": "reject_rate",
      "enterprise": "Enterprise B",
      "actual_value": "1.4%",
      "threshold": "1.5% (warning)",
      "severity": "medium"
    }
  ],
  "wasteAlerts": [
    {
      "enterprise": "Enterprise A",
      "metric": "Production_DefectCHK",
      "value": 12,
      "threshold": "warning",
      "message": "Check defects at 12/hr exceeding 10/hr warning threshold"
    }
  ],
  "recommendations": [
    "Inspect Enterprise B labeler alignment -- reject rate trending toward warning threshold",
    "Schedule preventive maintenance on Enterprise A inspection station to reduce check defects"
  ],
  "enterpriseInsights": {
    "Enterprise A": "Glass furnace operating at 2,710F (within 2,600-2,800F safe range). Check defects elevated at 12/hr but below critical threshold. ISMachine cycle time nominal at 10.1 seconds.",
    "Enterprise B": "Filler line recovered from 15-minute idle period. Current availability 98%. Reject rate trending upward at 1.4% -- monitor for threshold breach at 1.5%.",
    "Enterprise C": "SUB250 bioreactor in PRODUCTION phase, batch ID BIO-2026-0142. pH stable at 7.1, dissolved oxygen at 52%. Cleanroom Zone A humidity at 48% (nominal). TFF300 in CONCENTRATION phase."
  },
  "severity": "medium",
  "confidence": 0.85
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `summary` | string | 1-3 sentence overview of current factory state across all enterprises |
| `trends` | array | Identified trends with metric name, direction (`rising`, `falling`, `stable`), and percent change |
| `anomalies` | array | Detected anomalies -- see breakdown below |
| `wasteAlerts` | array | Material waste or efficiency loss warnings with enterprise, metric, value, and threshold level |
| `recommendations` | array | Actionable suggestions for operators, ordered by priority |
| `enterpriseInsights` | object | Per-enterprise analysis summaries keyed by enterprise name |
| `severity` | string | Overall severity of this analysis cycle: `low`, `medium`, or `high` |
| `confidence` | number | Confidence score from 0.0 to 1.0 indicating how certain Claude is about its findings |

**Anomaly object fields:**

| Field | Type | Description |
|---|---|---|
| `description` | string | Brief description of the anomaly |
| `reasoning` | string | Detailed explanation: what threshold was breached, expected vs. actual values, operational impact |
| `metric` | string | The measurement name that triggered the anomaly |
| `enterprise` | string | Which enterprise this anomaly belongs to (`Enterprise A`, `Enterprise B`, or `Enterprise C`) |
| `actual_value` | string | Current value with unit |
| `threshold` | string | The threshold that was breached or approached |
| `severity` | string | `low`, `medium`, or `high` |

---

## Dashboard Display

### Insight Cards

AI analysis results appear in the **AI Agent panel** on the dashboard. Each insight is rendered as a card with:

- **Summary text** -- the natural language overview from Claude
- **Anomaly count** -- if any anomalies were detected, shown as a red warning indicator
- **Confidence score** -- Claude's self-assessed confidence
- **Severity/priority** -- color-coded by severity level
- **Data points analyzed** -- how many metric data points were included
- **Timestamp** -- when the analysis was performed

Cards are displayed in reverse chronological order (newest first). The panel retains the 5 most recent insights.

### Severity Levels

Each insight and anomaly is tagged with a severity level, displayed as a color-coded badge:

| Badge | Severity | Meaning |
|---|---|---|
| :red_circle: Red | High | Critical threshold breached. Immediate operator attention required. |
| :yellow_circle: Amber | Medium | Warning threshold approached or breached. Monitor closely. |
| :large_blue_circle: Cyan | Low | Informational. Normal operations with minor observations. |

The card's left border color matches the severity level for quick visual scanning.

### Enterprise Filtering

The enterprise selector at the top of the dashboard filters insight content:

- **ALL** -- Shows the full multi-enterprise summary from Claude.
- **Enterprise A / B / C** -- Shows only the enterprise-specific insight from `enterpriseInsights`, and filters the anomaly list to show only anomalies tagged with that enterprise.

When an enterprise filter is active, the anomaly count badge also updates to reflect the filtered count.

### Anomaly Detail Modal

Click any anomaly card to open a detail modal with the full investigation context:

| Field | What it shows |
|---|---|
| Description | Brief anomaly description |
| Reasoning | Full reasoning chain from Claude, including tool investigation results |
| Metric | The specific measurement that triggered the anomaly |
| Enterprise | Which enterprise is affected |
| Actual Value | The current value that caused the alert |
| Threshold | The threshold that was breached, with unit |
| Severity | High, medium, or low |
| Timestamp | When the anomaly was detected |

This modal gives operators the context they need to decide whether to act, escalate, or acknowledge.

---

## Interactive Q&A

The **chat panel** lets you ask Claude questions about live factory data. This is useful when you want to investigate something the automated analysis did not cover, or when you need a plain-language explanation of what is happening.

### How It Works

1. Open the chat panel from the dashboard.
2. Type a question in natural language.
3. The question is sent via WebSocket to the EdgeMind server.
4. The server packages your question with **full factory context**: current statistics, recent trend insights, and connection status.
5. Claude responds with an answer grounded in live data.

### Example Questions

| Question | What Claude Does |
|---|---|
| "Why is Enterprise A's OEE dropping?" | Reviews recent OEE trends and identifies which component (availability, performance, quality) is pulling it down |
| "What's causing the temperature spike in Site 2?" | Checks recent temperature metrics for Site 2 and correlates with equipment states |
| "Is Enterprise C's batch on track?" | Reviews ISA-88 phase progression, batch IDs, and equipment states for Enterprise C |
| "Which machines are currently down?" | Summarizes equipment state data across all enterprises |
| "Should I be worried about the reject rate on the bottling line?" | Compares current reject rate against operator-defined thresholds and recent trends |

### Limitations

- Q&A responses are capped at 500 tokens to keep answers concise.
- The chat does not currently use investigative tools (OEE breakdown, equipment state queries). It relies on the most recent 3 trend insights and current factory statistics.
- If AI insights are disabled (`DISABLE_INSIGHTS=true`), the chat panel returns a message indicating that interactive queries are unavailable.

---

## Configuration

All AI analysis settings are controlled through environment variables. No code changes are needed.

| Variable | Default | Description |
|---|---|---|
| `DISABLE_INSIGHTS` | `false` | Set to `true` to disable the AI analysis loop entirely. MQTT data collection continues. |
| `AWS_REGION` | `us-east-1` | AWS region for the Bedrock API. |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-sonnet-4-20250514-v1:0` | Claude model used for analysis. |
| `BEDROCK_TIMEOUT_MS` | `30000` | Timeout in milliseconds for each Bedrock API call. |

**Analysis timing:**

The trend analysis interval is set to **30 seconds** (hardcoded in `lib/ai/index.js` as `TREND_ANALYSIS_INTERVAL = 30000`). The first analysis runs 15 seconds after the server starts. Each InfluxDB query uses an 8-second timeout to prevent hanging queries from consuming the full 30-second budget.

**Authentication:**

EdgeMind uses **AWS Bedrock**, not the Anthropic API directly. No `ANTHROPIC_API_KEY` is needed. The server authenticates via standard AWS credentials (IAM role, environment variables, or AWS config file).

**CMMS integration:**

When `CMMS_ENABLED=true` and a high-severity anomaly is detected, EdgeMind automatically creates work orders in MaintainX for affected equipment. See [[CMMS-Integration]] for details.

---

## See Also

- [[Anomaly-Filtering]] -- How to create custom anomaly filter rules and manage alert thresholds
- [[CMMS-Integration]] -- Automatic work order creation from high-severity anomalies
- [[Module-AI]] -- Developer reference for the `lib/ai/` module internals
