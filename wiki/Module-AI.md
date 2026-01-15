# Module: AI

**Source:** `lib/ai/index.js`

## Purpose

Provides Claude AI integration for real-time factory trend analysis. Implements an agentic loop that periodically queries InfluxDB, summarizes trends, and uses Claude (via AWS Bedrock) to detect anomalies and provide recommendations.

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `init` | Function | Initialize module with runtime dependencies |
| `startAgenticLoop` | Function | Start the trend analysis loop |
| `stopAgenticLoop` | Function | Stop the trend analysis loop |
| `runTrendAnalysis` | Function | Execute a single trend analysis cycle |
| `analyzeTreesWithClaude` | Function | Send trends to Claude for analysis |
| `askClaudeWithContext` | Function | Interactive Claude queries |
| `queryTrends` | Function | Query trend data from InfluxDB |
| `summarizeTrends` | Function | Format trends for Claude |
| `buildDomainContext` | Function | Build enterprise-specific context |
| `extractAffectedEquipment` | Function | Identify equipment for work orders |
| `processAnomaliesForWorkOrders` | Function | Create CMMS work orders |

## Initialization

The module requires runtime dependencies to be injected before use.

```javascript
const aiModule = require('./lib/ai');
const { broadcast } = require('./websocket');
const cmmsProvider = require('./lib/cmms-maintainx');
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

aiModule.init({
  broadcast,           // WebSocket broadcast function
  cmms: cmmsProvider,  // CMMS provider instance
  bedrockClient        // AWS Bedrock client
});
```

## Agentic Loop

The AI module runs a continuous analysis loop every 30 seconds.

### Lifecycle

```
startAgenticLoop()
        |
        v
   Wait 15 seconds (let data accumulate)
        |
        v
   +--------------------+
   |                    |
   v                    |
runTrendAnalysis() <----+
   |                    |
   +-- every 30 sec ----+
        |
        v
stopAgenticLoop()
```

### Starting the Loop

```javascript
const { startAgenticLoop } = require('./lib/ai');

startAgenticLoop();
// Logs: "Starting Agentic Trend Analysis Loop..."
```

### Stopping the Loop

```javascript
const { stopAgenticLoop } = require('./lib/ai');

stopAgenticLoop();
// Cleans up intervals and timeouts
```

## Function: runTrendAnalysis

The main orchestrator for each analysis cycle.

### Process

1. Query 5-minute trend data from InfluxDB
2. Summarize trends for Claude
3. Send to Claude for analysis
4. Store insight in `factoryState.trendInsights`
5. Broadcast to WebSocket clients
6. Optionally create CMMS work orders for high-severity anomalies

### Usage Example

```javascript
const { runTrendAnalysis } = require('./lib/ai');

await runTrendAnalysis();
// Logs: "Running trend analysis..."
// Logs: "Trend Analysis: <summary>"
```

## Function: queryTrends

Fetches aggregated trend data from InfluxDB.

### Flux Query

```flux
from(bucket: "factory")
  |> range(start: -5m)
  |> filter(fn: (r) => r._field == "value" and r._value > 0)
  |> group(columns: ["_measurement", "enterprise", "site", "area"])
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```

### Return Structure

```javascript
[
  {
    measurement: 'speed_metric',
    enterprise: 'Enterprise A',
    site: 'Dallas Line 1',
    area: 'packaging',
    time: '2026-01-14T18:30:00.000Z',
    value: 450.5
  },
  // ...
]
```

## Function: summarizeTrends

Converts raw trend data into a human-readable summary for Claude.

### Output Format

```
Enterprise A/Dallas Line 1/packaging/speed_metric: avg=450.25, change=2.5% (5 points)
Enterprise A/Dallas Line 1/packaging/count_total: avg=12500, change=5.2% (5 points)
...
```

### Logic

- Groups data by measurement path
- Calculates average value
- Calculates change percentage between first and last values
- Limits to top 30 measurements

## Function: buildDomainContext

Builds enterprise-specific context for Claude using domain knowledge.

### Output Example

```markdown
## Enterprise Domain Knowledge

**Enterprise A (Glass Manufacturing)**
- Critical Metrics: temperature, gob_weight, defect_count
- Key Concerns: thermal_shock, crown_temperature, refractory_wear
- Safe Ranges: furnace_temp: 2600-2800 °F (CRITICAL)
- Waste Thresholds: Warning > 10 defects/hr, Critical > 25 defects/hr

**Enterprise B (Beverage Bottling)**
- Critical Metrics: countinfeed, countoutfeed, countdefect, oee
...
```

## Function: analyzeTreesWithClaude

Sends summarized trends to Claude for analysis via AWS Bedrock.

### AI Prompt Structure

The prompt includes several sections:

1. **Domain Context** - Enterprise-specific knowledge
2. **Operator Thresholds** - Business-calibrated alert levels
3. **Previous Insights** - Deduplication of recent alerts
4. **Current Trend Data** - The actual metrics
5. **Anomaly Filter Rules** - User-defined filters

### Threshold Settings

From `factoryState.thresholdSettings`:

```javascript
{
  oeeBaseline: 70,        // Below is concerning
  oeeWorldClass: 85,      // Above is excellent
  availabilityMin: 65,    // Below is critical
  defectRateWarning: 2,   // Above triggers warning
  defectRateCritical: 5   // Above triggers critical
}
```

### Expected JSON Response

```json
{
  "summary": "Factory running at 78% OEE with minor efficiency drop in packaging",
  "trends": [
    { "metric": "speed_metric", "direction": "falling", "change_percent": -2.5 }
  ],
  "anomalies": [
    {
      "description": "Packaging line speed below threshold",
      "reasoning": "Speed of 420 BPM is below minimum 450 BPM threshold",
      "metric": "speed_metric",
      "enterprise": "Enterprise A",
      "actual_value": "420 BPM",
      "threshold": "450 BPM minimum",
      "severity": "medium"
    }
  ],
  "wasteAlerts": [
    { "enterprise": "Enterprise A", "metric": "defect_count", "value": 15, "threshold": "warning", "message": "Defects above 10/hr" }
  ],
  "recommendations": ["Investigate packaging line speed sensor", "Review recent maintenance logs"],
  "enterpriseInsights": {
    "Enterprise A": "Glass furnace temperature stable, watch packaging efficiency"
  },
  "severity": "medium",
  "confidence": 0.85
}
```

## Memory Injection

The AI module uses previous insights to prevent duplicate alerts.

### Deduplication Logic

```javascript
const previousInsightsSection = factoryState.trendInsights.length > 0
  ? `## Previous Analysis (Last ${Math.min(factoryState.trendInsights.length, 3) * 30} seconds)

The following anomalies were already reported. Do NOT repeat these unless they have WORSENED:
${factoryState.trendInsights.slice(-3).map((insight, i) =>
    `${i + 1}. ${insight.summary} (Severity: ${insight.severity})`
  ).join('\n')}

**Instructions:** Only report NEW anomalies or significantly WORSENING trends.`
  : '';
```

## CMMS Integration

When Claude detects high-severity anomalies, the module can automatically create work orders.

### Process

1. Check if CMMS is enabled and severity is 'high'
2. Extract affected equipment from trends
3. Create work orders via CMMS provider
4. Broadcast work order creation to WebSocket clients

### Equipment Priority

Equipment is sorted by priority for work order creation:
1. DOWN (priority 3)
2. IDLE (priority 2)
3. RUNNING (priority 1)
4. UNKNOWN (priority 0)

Limited to 5 work orders per analysis cycle.

## Function: askClaudeWithContext

Allows interactive queries with factory context.

### Usage Example

```javascript
const { askClaudeWithContext } = require('./lib/ai');

const response = await askClaudeWithContext(
  "What's causing the efficiency drop in Enterprise A?"
);
```

### Context Included

- Factory stats (message count, anomaly count)
- Recent trend insights (last 3)

## WebSocket Events

### Trend Insight Broadcast

```javascript
{
  type: 'trend_insight',
  data: {
    id: 'trend_1705258200000',
    timestamp: '2026-01-14T18:30:00.000Z',
    summary: '...',
    trends: [...],
    anomalies: [...],
    severity: 'medium',
    confidence: 0.85
  }
}
```

### CMMS Work Order Created

```javascript
{
  type: 'cmms_work_order_created',
  data: {
    workOrder: { workOrderId: '...', status: 'OPEN', url: '...' },
    equipment: { enterprise: '...', site: '...', machine: '...' },
    anomaly: { summary: '...', severity: 'high', timestamp: '...' }
  }
}
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | AWS region for Bedrock (default: us-east-1) |
| `BEDROCK_MODEL_ID` | Claude model ID |
| `DISABLE_INSIGHTS` | Set to 'true' to disable AI analysis |

### Timing

```javascript
const TREND_ANALYSIS_INTERVAL = 30000; // 30 seconds
// First analysis after 15 seconds startup delay
```

## Related Modules

| Module | Relationship |
|--------|--------------|
| [Module-Influx-Client](Module-Influx-Client) | Provides `queryApi` for trend data |
| [Module-CMMS](Module-CMMS) | Creates work orders for anomalies |

## Error Handling

- InfluxDB query errors return empty results (graceful degradation)
- Bedrock API errors are logged and return null
- JSON parse errors return raw text with `parseError: true` flag

## See Also

- [Module-CMMS](Module-CMMS) - Work order creation
- [Factory Enterprises Explained](Factory-Enterprises-Explained) - Domain context
