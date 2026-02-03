# CMMS Integration (MaintainX)

EdgeMind integrates with [MaintainX](https://www.getmaintainx.com/) to automatically create maintenance work orders when the AI analysis loop detects high-severity anomalies. This closes the loop between AI-detected issues and maintenance action -- no manual ticket creation required.

The integration is **optional** and **disabled by default**. When enabled, EdgeMind acts as an automated dispatcher: Claude analyzes factory trends, identifies anomalies, and files work orders directly into your MaintainX queue with full equipment context.

---

## Table of Contents

- [Configuration](#configuration)
- [How It Works](#how-it-works)
  - [Trigger Conditions](#trigger-conditions)
  - [Work Order Payload](#work-order-payload)
  - [Severity-to-Priority Mapping](#severity-to-priority-mapping)
  - [Retry Logic](#retry-logic)
- [REST API Endpoints](#rest-api-endpoints)
  - [Health Check](#health-check)
  - [List Work Orders](#list-work-orders)
  - [Get Work Order by ID](#get-work-order-by-id)
- [Frontend: Plant Alerts View](#frontend-plant-alerts-view)
- [Extensibility](#extensibility)
  - [Provider Interface](#provider-interface)
  - [Adding a New Provider](#adding-a-new-provider)
- [Troubleshooting](#troubleshooting)
- [See Also](#see-also)

---

## Configuration

Two environment variables control the integration.

| Variable | Required | Default | Description |
|---|---|---|---|
| `CMMS_ENABLED` | No | `false` | Set to `'true'` to enable the MaintainX integration |
| `MAINTAINX_API_KEY` | When enabled | _(none)_ | Your MaintainX API key |

Optional variables for advanced configuration:

| Variable | Default | Description |
|---|---|---|
| `CMMS_PROVIDER` | `maintainx` | CMMS provider name (only `maintainx` is currently supported) |
| `MAINTAINX_BASE_URL` | `https://api.getmaintainx.com/v1` | MaintainX API base URL (override for self-hosted or staging environments) |
| `MAINTAINX_DEFAULT_LOCATION_ID` | _(none)_ | Default MaintainX location ID to assign to work orders |
| `MAINTAINX_DEFAULT_ASSIGNEE_ID` | _(none)_ | Default MaintainX user ID to assign work orders to |

### Example: Enable CMMS in your environment

```bash
# .env or shell export
CMMS_ENABLED=true
MAINTAINX_API_KEY=your-api-key-here
```

On startup, the server logs confirmation:

```
CMMS provider initialized: MaintainXProvider
```

If the API key is missing or invalid, the provider disables itself and logs a warning:

```
[MaintainX] API key not configured. Integration disabled.
```

---

## How It Works

### Trigger Conditions

The AI analysis loop (in `lib/ai/index.js`) runs every 30 seconds. After each analysis cycle, EdgeMind checks whether the result warrants a work order. **All three conditions must be true:**

1. The CMMS provider is enabled and healthy.
2. Claude's analysis returned a **high** severity rating.
3. The analysis contains at least one anomaly entry.

Low and medium severity anomalies are surfaced in the dashboard but do **not** create work orders.

### Work Order Payload

When triggered, EdgeMind builds a MaintainX work order with the following structure:

**Title** (max 200 characters):
```
Enterprise A - Dallas Line 1 - Palletizer03: Vibration exceeding threshold
```

Format: `{Enterprise} - {Site} - {Machine}: {Anomaly Summary}`

**Description** (Markdown-formatted):

```markdown
AI-Detected Anomaly - HIGH severity

## Summary
Vibration levels on Palletizer03 have exceeded normal operating range for 12 minutes.

## Equipment
- Enterprise: Enterprise A
- Site: Dallas Line 1
- Area/Line: packaging
- Machine: Palletizer03
- Current State: RUNNING

## Issues Detected
- Vibration amplitude 4.2mm/s exceeds 3.0mm/s threshold
- Frequency spectrum shift detected at 120Hz

## Recommended Actions
- Inspect bearing assembly on drive motor
- Check alignment of conveyor belt tension

## AI Analysis Details
- Confidence: 87.5%
- Detected At: 2/1/2026, 2:45:30 PM
- Analysis ID: insight-1706810730

---
_This work order was automatically created by EdgeMind OPE Insights AI monitoring system._
```

**Priority**: Mapped from Claude's severity rating (see table below).

### Severity-to-Priority Mapping

| Claude Severity | MaintainX Priority |
|---|---|
| `high` | HIGH |
| `medium` | MEDIUM |
| `low` | LOW |
| _(unrecognized)_ | MEDIUM (default) |

Only `high` severity anomalies trigger automatic work order creation. The mapping applies to the priority field on the created work order.

### Retry Logic

API calls to MaintainX include automatic retry with exponential backoff:

- **Max attempts**: 3
- **Retry conditions**: HTTP 5xx errors, HTTP 429 (rate limited), network errors
- **Backoff**: `retryDelayMs * attemptNumber` (1s, 2s, 3s by default)
- **Non-retryable**: HTTP 4xx errors (except 429) fail immediately

### Deduplication

The AI loop deduplicates work orders by affected equipment. If the same machine appears in multiple anomaly entries within a single analysis cycle, only one work order is created. A maximum of **5 work orders per analysis cycle** prevents overwhelming the maintenance queue.

When a work order is successfully created, it is broadcast to all connected WebSocket clients as a `cmms_work_order_created` message.

---

## REST API Endpoints

All CMMS endpoints return JSON. If CMMS is not enabled, they return HTTP 503 with an error message.

### Health Check

```
GET /api/cmms/health
```

Returns the current status of the CMMS provider.

**Response (CMMS enabled and healthy):**

```json
{
  "enabled": true,
  "healthy": true,
  "message": "MaintainX connection OK",
  "provider": "MaintainX",
  "baseUrl": "https://api.getmaintainx.com/v1"
}
```

**Response (CMMS not configured):**

```json
{
  "enabled": false,
  "healthy": false,
  "message": "CMMS provider not configured"
}
```

### List Work Orders

```
GET /api/cmms/work-orders?limit=N
```

Returns recent work orders from MaintainX.

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | integer | 10 | 50 | Number of work orders to return |

**Response:**

```json
{
  "workOrders": [
    {
      "id": "wo_12345",
      "number": "WO-0042",
      "title": "Enterprise A - Dallas Line 1 - Palletizer03: Vibration exceeding threshold",
      "status": "OPEN",
      "priority": "HIGH",
      "createdAt": "2026-02-01T14:45:30.000Z",
      "assignedTo": "Jane Martinez"
    }
  ],
  "count": 1,
  "provider": "MaintainX"
}
```

### Get Work Order by ID

```
GET /api/cmms/work-orders/:id
```

Returns the current status of a specific work order.

**Response:**

```json
{
  "workOrder": {
    "id": "wo_12345",
    "status": "IN_PROGRESS",
    "assignedTo": "Jane Martinez",
    "updatedAt": "2026-02-01T15:10:00.000Z",
    "completedAt": null
  },
  "provider": "MaintainX"
}
```

**Error (CMMS disabled):**

```json
{
  "error": "CMMS integration is not enabled",
  "hint": "Set CMMS_ENABLED=true and configure MAINTAINX_API_KEY"
}
```

---

## Frontend: Plant Alerts View

The **Plant Manager** persona includes a dedicated Alerts and Work Orders panel (`js/plant-alerts.js`). This view combines two data sources into a single operational picture:

**Alerts Section**
- Displays real-time AI-detected anomalies received via WebSocket.
- Each alert card shows severity (CRITICAL / WARNING / INFO), timestamp, description, and enterprise.
- Severity filter buttons let you narrow the view to a specific level.
- Alerts are sorted newest-first.

**Work Orders Section**
- Fetches work orders from `/api/cmms/work-orders?limit=20` on a 30-second refresh interval.
- Each card shows the work order title, current status badge, priority, and assignee.
- Status badges reflect the MaintainX lifecycle: **Open**, **In Progress**, **Completed**.
- If CMMS is not connected, the panel displays a "CMMS Not Connected" message with configuration guidance.

The health check (`/api/cmms/health`) runs on each refresh cycle. If the CMMS provider becomes unavailable, the work orders section gracefully degrades to the disconnected state without affecting the alerts section.

---

## Extensibility

### Provider Interface

The CMMS system uses a provider pattern defined in `lib/cmms-interface.js`. The base class `CMmsProvider` declares four abstract methods that every provider must implement:

| Method | Description |
|---|---|
| `createWorkOrder(anomaly, equipment)` | Create a work order from anomaly data. Returns work order ID, number, status, and URL. |
| `getWorkOrderStatus(workOrderId)` | Retrieve current status of a work order by ID. |
| `listRecentWorkOrders(limit)` | List recent work orders with summary data. |
| `healthCheck()` | Test connectivity and authentication. Returns `{ healthy: boolean, message: string }`. |

Two utility methods are provided by the base class:
- `isEnabled()` -- returns whether the provider is active
- `getProviderName()` -- returns the class name for logging

### Adding a New Provider

To add support for a different CMMS (for example, Fiix, UpKeep, or SAP PM):

1. Create a new file `lib/cmms-{provider}.js` that extends `CMmsProvider`.
2. Implement all four abstract methods.
3. Register it in the factory function inside `lib/cmms-interface.js`:

```javascript
// lib/cmms-interface.js - createCmmsProvider()
const providers = {
  'maintainx': () => {
    const MaintainXProvider = require('./cmms-maintainx');
    return new MaintainXProvider(config);
  },
  'fiix': () => {
    const FiixProvider = require('./cmms-fiix');
    return new FiixProvider(config);
  },
};
```

4. Add the provider's configuration block to `lib/config.js` under `cmms`.
5. Set `CMMS_PROVIDER=fiix` in your environment to select it.

No changes to the AI loop, REST endpoints, or frontend are required. The provider is resolved at startup and injected into the AI module via the `init()` dependency injection call.

---

## Troubleshooting

### `/api/cmms/health` returns `enabled: false`

**Cause:** The `CMMS_ENABLED` environment variable is not set or is not exactly `'true'`.

**Fix:** Set the variable and restart the server:

```bash
export CMMS_ENABLED=true
npm start
```

Verify in the startup logs:

```
CMMS provider initialized: MaintainXProvider
```

---

### `/api/cmms/health` returns `healthy: false`

**Cause:** The MaintainX API key is missing, invalid, or expired. The health check attempts a lightweight API call (`GET /workorders?limit=1`) and reports failure if it does not receive a 2xx response.

**Checks:**

1. Confirm the API key is set:
```bash
echo $MAINTAINX_API_KEY
```

2. Test the key directly:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $MAINTAINX_API_KEY" \
  https://api.getmaintainx.com/v1/workorders?limit=1
```

Expected: `200`. If you get `401`, regenerate the key in MaintainX settings.

---

### Work orders are not being created

**Cause:** Only **high** severity anomalies trigger work order creation. Medium and low severity anomalies appear in the dashboard but are not dispatched to MaintainX.

**Checks:**

1. Verify CMMS is enabled and healthy:
```bash
curl http://localhost:3000/api/cmms/health
```

2. Check the AI analysis loop is producing high-severity insights. Look for this log line:
```
Processing N anomalies for work order creation...
```

3. If the log shows `No specific equipment identified for work order creation`, the AI detected an anomaly but could not map it to a specific machine. This can happen when trend data lacks equipment-level granularity.

---

### Duplicate work orders appearing

**Cause:** The AI loop deduplicates by equipment within a single analysis cycle, but if the same anomaly recurs across multiple cycles (every 30 seconds), a new work order may be created each time.

**Mitigation:** This is expected behavior for persistent anomalies. Review whether the underlying condition is genuinely recurring or if the anomaly detection threshold needs adjustment. Completed or in-progress work orders in MaintainX are not currently checked before creating new ones.

---

### `MaintainX API error: 429 Too Many Requests`

**Cause:** MaintainX rate limiting. The provider retries automatically (up to 3 attempts with exponential backoff).

**Fix:** If the error persists after retries, reduce the analysis interval or contact MaintainX support to increase your rate limit.

---

### Network errors in production (Fargate)

**Cause:** The ECS task may not have outbound internet access to reach `api.getmaintainx.com`.

**Checks:**

1. Verify the task's security group allows outbound HTTPS (port 443).
2. Verify the subnet has a NAT gateway or internet gateway route.
3. Check CloudWatch logs for network-level errors:
```bash
aws logs tail /ecs/edgemind-prod-backend --since 10m --format short \
  | grep -i "maintainx\|cmms"
```

---

## See Also

- [[AI-Trend-Analysis]] -- How Claude analyzes factory trends and detects anomalies
- [[Module-CMMS]] -- Technical reference for `lib/cmms-interface.js` and `lib/cmms-maintainx.js`
- [[Anomaly-Filtering]] -- Frontend anomaly severity filtering and display
