# REST API Reference

EdgeMind exposes a REST API on port 3000 (configurable via `PORT` environment variable). All endpoints return JSON responses.

## Base URL

```
http://localhost:3000
```

Production: `http://<YOUR_EC2_IP>:3000`

---

## Health & Status

### GET /health

Server health check with MQTT and InfluxDB connection status.

**Response:**

```json
{
  "status": "online",
  "mqtt": true,
  "influxdb": true,
  "stats": {
    "messageCount": 125430,
    "lastUpdate": "2025-01-13T14:30:00.000Z",
    "influxWrites": 125428,
    "influxWriteErrors": 2
  }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always "online" if server responds |
| `mqtt` | boolean | MQTT broker connection status |
| `influxdb` | boolean | InfluxDB connection status |
| `stats.messageCount` | number | Total MQTT messages received |
| `stats.lastUpdate` | string | ISO timestamp of last message |
| `stats.influxWrites` | number | Successful InfluxDB writes |
| `stats.influxWriteErrors` | number | Failed InfluxDB writes |

**Example:**

```bash
curl http://localhost:3000/health
```

---

## Schema Discovery

### GET /api/schema/measurements

Returns all measurements with metadata. Data is cached for 5 minutes.

**Response:**

```json
{
  "measurements": [
    {
      "name": "OEE_Performance",
      "count": 15420,
      "valueType": "numeric",
      "sampleValues": [85.2, 92.1, 78.5],
      "enterprises": ["Enterprise A", "Enterprise B"],
      "sites": ["Dallas Line 1", "Site3"],
      "classification": "oee"
    }
  ],
  "summary": {
    "totalMeasurements": 142,
    "dataPoints24h": 1250000
  },
  "cached": true,
  "cacheAge": 45000
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `measurements` | array | List of measurement metadata objects |
| `measurements[].name` | string | Measurement name (last 2 parts of topic) |
| `measurements[].count` | number | Data point count in last 24h |
| `measurements[].valueType` | string | "numeric" or "string" |
| `measurements[].sampleValues` | array | Recent sample values |
| `measurements[].enterprises` | array | Enterprises reporting this measurement |
| `measurements[].sites` | array | Sites reporting this measurement |
| `measurements[].classification` | string | Category (oee, temperature, production, etc.) |
| `summary.totalMeasurements` | number | Unique measurement count |
| `summary.dataPoints24h` | number | Total data points in last 24h |
| `cached` | boolean | Whether response is from cache |
| `cacheAge` | number | Cache age in milliseconds |

**Example:**

```bash
curl http://localhost:3000/api/schema/measurements
```

---

### GET /api/schema/hierarchy

Returns hierarchical topic structure. Data is cached for 5 minutes.

**Response:**

```json
{
  "hierarchy": {
    "Enterprise A": {
      "Dallas Line 1": {
        "packaging": {
          "packager01": {
            "measurements": ["OEE_Performance", "Production_GoodCount"],
            "dataPointCount": 5420
          }
        }
      }
    },
    "Enterprise B": {
      "Site3": {
        "palletizing": {
          "palletizermanual01": {
            "measurements": ["metric_oee", "workstation_status"],
            "dataPointCount": 3200
          }
        }
      }
    }
  },
  "lastUpdated": "2025-01-13T14:25:00.000Z",
  "cached": true,
  "cacheAge": 30000
}
```

**Structure:**

```
Enterprise → Site → Area → Machine → { measurements, dataPointCount }
```

**Example:**

```bash
curl http://localhost:3000/api/schema/hierarchy
```

---

### GET /api/schema/classifications

Returns measurements grouped by classification category.

**Response:**

```json
{
  "classifications": {
    "oee": ["OEE_Performance", "OEE_Availability", "OEE_Quality", "metric_oee"],
    "temperature": ["furnace_temperature", "reactor_temp_PV"],
    "production": ["Production_GoodCount", "Production_DefectCount"],
    "state": ["StateCurrent", "equipment_status"],
    "percentage_metric": ["motor_load_percent"],
    "unknown": ["custom_metric_xyz"]
  },
  "summary": {
    "oee": 12,
    "temperature": 8,
    "production": 15,
    "state": 6,
    "percentage_metric": 4,
    "unknown": 3
  },
  "totalMeasurements": 48,
  "cached": true,
  "cacheAge": 15000
}
```

**Example:**

```bash
curl http://localhost:3000/api/schema/classifications
```

---

## Factory Data

### GET /api/trends

Returns 5-minute rolling window of factory metrics aggregated in 1-minute intervals.

**Response:**

```json
[
  {
    "timestamp": "2025-01-13T14:25:00.000Z",
    "enterprise": "Enterprise A",
    "site": "Dallas Line 1",
    "measurement": "OEE_Performance",
    "value": 85.2,
    "mean": 84.8,
    "min": 82.1,
    "max": 87.5
  }
]
```

**Example:**

```bash
curl http://localhost:3000/api/trends
```

---

### GET /api/equipment/states

Returns current equipment states from in-memory cache.

**Response:**

```json
{
  "states": [
    {
      "enterprise": "Enterprise A",
      "site": "Dallas Line 1",
      "machine": "Furnace_01",
      "state": 3,
      "stateName": "RUNNING",
      "color": "#00ff88",
      "reason": null,
      "durationMs": 3600000,
      "durationFormatted": "1h 0m",
      "lastUpdate": "2025-01-13T13:30:00.000Z"
    }
  ],
  "summary": {
    "running": 12,
    "idle": 3,
    "down": 1,
    "unknown": 0
  },
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**State Codes:**

| Code | Name | Color |
|------|------|-------|
| 1 | DOWN | #ff3366 (red) |
| 2 | IDLE | #ffaa00 (amber) |
| 3 | RUNNING | #00ff88 (green) |

**Example:**

```bash
curl http://localhost:3000/api/equipment/states
```

---

## OEE (Overall Equipment Effectiveness)

### GET /api/oee

Legacy endpoint. Returns 24h average OEE for specified enterprise.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enterprise` | string | No | "A", "B", "C", or "ALL" (default: ALL) |

**Response:**

```json
{
  "enterprise": "Enterprise A",
  "oee": 78.5,
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Example:**

```bash
curl "http://localhost:3000/api/oee?enterprise=A"
```

---

### GET /api/oee/v2

Enhanced OEE calculation with tier-based strategy. Returns calculation metadata.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enterprise` | string | No | "ALL", "Enterprise A", "Enterprise B", or "Enterprise C" (default: ALL) |
| `site` | string | No | Filter by specific site |

**Response (single enterprise):**

```json
{
  "enterprise": "Enterprise A",
  "oee": 78.5,
  "availability": 92.1,
  "performance": 88.3,
  "quality": 96.5,
  "tier": 1,
  "method": "Direct OEE measurement available",
  "confidence": "high",
  "measurementsUsed": ["OEE_Performance", "OEE_Availability", "OEE_Quality"],
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Response (ALL enterprises):**

```json
{
  "overall": {
    "oee": 76.2,
    "enterpriseCount": 3,
    "validEnterpriseCount": 2
  },
  "enterprises": [
    {
      "enterprise": "Enterprise A",
      "oee": 78.5,
      "tier": 1,
      "method": "Direct OEE measurement",
      "confidence": "high"
    },
    {
      "enterprise": "Enterprise B",
      "oee": 73.9,
      "tier": 2,
      "method": "Calculated from A*P*Q components",
      "confidence": "medium"
    },
    {
      "enterprise": "Enterprise C",
      "oee": null,
      "tier": 4,
      "method": "ISA-88 batch control (OEE not applicable)",
      "confidence": "n/a"
    }
  ],
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**OEE Tiers:**

| Tier | Method | Confidence |
|------|--------|------------|
| 1 | Direct OEE measurement | High |
| 2 | Calculated from A*P*Q components | Medium |
| 3 | Estimated from proxy metrics | Low |
| 4 | Not applicable (ISA-88 batch) | N/A |

**Example:**

```bash
# All enterprises
curl "http://localhost:3000/api/oee/v2"

# Single enterprise
curl "http://localhost:3000/api/oee/v2?enterprise=Enterprise%20A"

# Enterprise + site filter
curl "http://localhost:3000/api/oee/v2?enterprise=Enterprise%20A&site=Dallas%20Line%201"
```

---

### GET /api/oee/discovery

Returns discovered OEE schema showing available measurements and tier per enterprise.

**Response:**

```json
{
  "enterprises": {
    "Enterprise A": {
      "tier": 1,
      "measurements": {
        "oee": ["OEE_Performance"],
        "availability": ["OEE_Availability"],
        "performance": ["OEE_Performance"],
        "quality": ["OEE_Quality"]
      }
    },
    "Enterprise B": {
      "tier": 2,
      "measurements": {
        "availability": ["metric_availability"],
        "performance": ["metric_performance"],
        "quality": ["metric_quality"]
      }
    },
    "Enterprise C": {
      "tier": 4,
      "measurements": {},
      "note": "ISA-88 batch control - OEE not applicable"
    }
  },
  "availableTiers": {
    "1": "Direct OEE measurement",
    "2": "A*P*Q calculation",
    "3": "Proxy estimation",
    "4": "Not applicable"
  },
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Example:**

```bash
curl http://localhost:3000/api/oee/discovery
```

---

### GET /api/oee/breakdown

Returns 24h OEE breakdown by enterprise.

**Response:**

```json
{
  "breakdown": {
    "Enterprise A": {
      "oee": 78.5,
      "availability": 92.1,
      "performance": 88.3,
      "quality": 96.5
    },
    "Enterprise B": {
      "oee": 73.9,
      "availability": 89.2,
      "performance": 85.1,
      "quality": 97.3
    }
  },
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Example:**

```bash
curl http://localhost:3000/api/oee/breakdown
```

---

### GET /api/oee/lines

Returns line-level OEE grouped by enterprise/site/area.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enterprise` | string | No | Filter by enterprise (default: ALL) |

**Response:**

```json
{
  "lines": [
    {
      "enterprise": "Enterprise A",
      "site": "Dallas Line 1",
      "line": "packaging",
      "oee": 82.3,
      "availability": null,
      "performance": null,
      "quality": null,
      "tier": 1
    }
  ],
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Note:** Enterprise C returns empty array with message about ISA-88 batch control.

**Example:**

```bash
curl "http://localhost:3000/api/oee/lines?enterprise=Enterprise%20A"
```

---

### GET /api/factory/status

Returns hierarchical OEE status by enterprise and site.

**Response:**

```json
{
  "status": {
    "Enterprise A": {
      "overall": 78.5,
      "sites": {
        "Dallas Line 1": 82.3,
        "Dallas Line 2": 74.7
      }
    }
  },
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Example:**

```bash
curl http://localhost:3000/api/factory/status
```

---

## Waste & Defect Tracking

### GET /api/waste/trends

Returns 24h waste/defect trends aggregated hourly.

**Response:**

```json
{
  "trends": [
    {
      "time": "2025-01-13T13:00:00.000Z",
      "enterprise": "Enterprise A",
      "line": "packaging",
      "value": 12.5,
      "measurement": "OEE_Waste"
    }
  ],
  "summary": {
    "Enterprise A": {
      "total": 145.2,
      "avg": 6.05,
      "trend": "falling",
      "dataPoints": 24
    }
  },
  "linesSummary": [
    {
      "enterprise": "Enterprise A",
      "line": "packaging",
      "total": 89.3,
      "avg": 3.72,
      "dataPoints": 24
    }
  ],
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Trend Values:** "rising", "falling", "stable"

**Example:**

```bash
curl http://localhost:3000/api/waste/trends
```

---

### GET /api/waste/by-line

Returns total waste per production line over 24h.

**Response:**

```json
{
  "lines": [
    {
      "enterprise": "Enterprise A",
      "site": "Dallas Line 1",
      "line": "packaging",
      "area": "packaging",
      "total": 89.3,
      "measurements": ["OEE_Waste", "Production_DefectCHK"]
    }
  ],
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

Lines are sorted by total waste (descending).

**Example:**

```bash
curl http://localhost:3000/api/waste/by-line
```

---

## Settings

### GET /api/settings

Returns current threshold settings for OEE and defect rate alerts.

**Response:**

```json
{
  "oeeBaseline": 65,
  "oeeWorldClass": 85,
  "availabilityMin": 90,
  "defectRateWarning": 2,
  "defectRateCritical": 5
}
```

**Example:**

```bash
curl http://localhost:3000/api/settings
```

---

### POST /api/settings

Updates threshold settings. Broadcasts changes to all WebSocket clients.

**Request Body:**

```json
{
  "oeeBaseline": 70,
  "oeeWorldClass": 88,
  "availabilityMin": 92,
  "defectRateWarning": 1.5,
  "defectRateCritical": 4
}
```

All fields are optional. Only provided fields are updated.

**Validation:**
- All values must be numbers between 0 and 100

**Response:**

```json
{
  "oeeBaseline": 70,
  "oeeWorldClass": 88,
  "availabilityMin": 92,
  "defectRateWarning": 1.5,
  "defectRateCritical": 4
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"oeeBaseline": 70, "oeeWorldClass": 88}'
```

---

## CMMS Integration

CMMS (Computerized Maintenance Management System) endpoints. Requires `CMMS_ENABLED=true` in environment.

### GET /api/cmms/health

Check CMMS provider health and connectivity.

**Response (enabled):**

```json
{
  "enabled": true,
  "healthy": true,
  "message": "MaintainX connection OK",
  "provider": "MaintainX",
  "baseUrl": "https://api.getmaintainx.com/v1",
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Response (disabled):**

```json
{
  "enabled": false,
  "healthy": false,
  "message": "CMMS provider not configured"
}
```

**Example:**

```bash
curl http://localhost:3000/api/cmms/health
```

---

### GET /api/cmms/work-orders

List recent work orders from CMMS.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of work orders (default: 10, max: 50) |

**Response:**

```json
{
  "provider": "MaintainXProvider",
  "workOrders": [
    {
      "id": "wo_123456",
      "number": "WO-2025-001",
      "title": "Enterprise A - Site 1 - Furnace: Temperature anomaly",
      "status": "OPEN",
      "priority": "URGENT",
      "createdAt": "2025-01-13T10:30:00.000Z",
      "assignedTo": "John Doe"
    }
  ],
  "count": 1,
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Error Response (CMMS disabled):**

```json
{
  "error": "CMMS integration is not enabled",
  "enabled": false
}
```

**Example:**

```bash
curl "http://localhost:3000/api/cmms/work-orders?limit=20"
```

---

### GET /api/cmms/work-orders/:id

Get status of a specific work order.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Work order ID (alphanumeric, hyphens, underscores only) |

**Response:**

```json
{
  "provider": "MaintainXProvider",
  "workOrder": {
    "id": "wo_123456",
    "status": "IN_PROGRESS",
    "assignedTo": "John Doe",
    "updatedAt": "2025-01-13T11:00:00.000Z",
    "completedAt": null
  },
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

**Example:**

```bash
curl http://localhost:3000/api/cmms/work-orders/wo_123456
```

---

## Agent Context

### GET /api/agent/context

Comprehensive data endpoint for agentic workflows. Returns all available factory context in a single request. Uses `Promise.allSettled()` for resilience - returns partial data if some sources are unavailable.

**Response:**

```json
{
  "timestamp": "2025-01-13T14:30:00.000Z",
  "factory": {
    "hierarchy": { /* enterprise/site/area/machine structure */ },
    "measurements": {
      "list": [ /* measurement objects */ ],
      "count": 142
    },
    "status": "available"
  },
  "equipment": {
    "states": [
      {
        "enterprise": "Enterprise A",
        "site": "Dallas Line 1",
        "machine": "Furnace_01",
        "state": 3,
        "stateName": "RUNNING",
        "color": "#00ff88",
        "durationMs": 3600000,
        "durationFormatted": "1h 0m",
        "lastUpdate": "2025-01-13T13:30:00.000Z"
      }
    ],
    "summary": {
      "running": 12,
      "idle": 3,
      "down": 1,
      "total": 16
    },
    "status": "available"
  },
  "performance": {
    "oee": [
      {
        "enterprise": "Enterprise A",
        "oee": 78.5,
        "tier": 1,
        "confidence": "high"
      }
    ],
    "status": "available"
  },
  "trends": {
    "recent": [ /* last 50 trend data points */ ],
    "status": "available"
  },
  "insights": {
    "recent": [ /* last 5 AI insights */ ],
    "status": "available"
  },
  "meta": {
    "enterprises": {
      "Enterprise A": {
        "domain": "Glass Manufacturing",
        "context": "High-temperature glass production"
      }
    },
    "measurementClassifications": {
      "oee": ["OEE", "metric_oee", "Performance"],
      "temperature": ["temp", "temperature", "furnace"]
    }
  },
  "dataSourceStatus": {
    "mqtt": true,
    "influxdb": true
  }
}
```

**Status Values:**
- `"available"` - Data retrieved successfully
- `"unavailable"` - Data source failed (partial response)

**Example:**

```bash
curl http://localhost:3000/api/agent/context
```

---

## Error Responses

All endpoints return consistent error format:

**400 Bad Request:**

```json
{
  "error": "Invalid enterprise parameter"
}
```

**500 Internal Server Error:**

```json
{
  "error": "Failed to query OEE data",
  "message": "Connection timeout"
}
```

**503 Service Unavailable:**

```json
{
  "error": "CMMS integration is not enabled",
  "enabled": false
}
```

---

## Rate Limits

No rate limits are enforced. InfluxDB query performance may degrade under heavy load.

Recommended polling intervals:
- `/health` - 10 seconds
- `/api/trends` - 5 seconds
- `/api/schema/*` - 5 minutes (cached)
- `/api/oee/*` - 30 seconds
- `/api/agent/context` - 30 seconds
