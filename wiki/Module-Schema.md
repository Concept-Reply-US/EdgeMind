# Module: Schema

**Source:** `lib/schema/index.js`

## Purpose

Discovers and caches the factory data schema by querying InfluxDB. Provides two key capabilities:
1. **Measurement Discovery** - Finds all measurements with metadata (counts, value types, sample values)
2. **Hierarchy Discovery** - Builds a tree structure of Enterprise -> Site -> Area -> Machine -> Measurements

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `refreshSchemaCache` | Function | Refreshes measurement metadata cache |
| `refreshHierarchyCache` | Function | Refreshes hierarchical topic structure cache |
| `classifyMeasurementDetailed` | Function | Classifies a measurement by name, type, and sample values |

## Dependencies

```javascript
const { queryApi } = require('../influx/client');
const { schemaCache } = require('../state');
const CONFIG = require('../config');
const { sanitizeInfluxIdentifier } = require('../validation');
const { MEASUREMENT_CLASSIFICATIONS } = require('../domain-context');
```

## Function: refreshSchemaCache

Queries InfluxDB to discover all measurements and their metadata.

### Behavior

1. **Cache Check:** Skips refresh if cache is still valid (< 5 minutes old)
2. **Concurrency Guard:** Prevents multiple simultaneous refreshes
3. **Count Query:** Gets measurement counts grouped by enterprise and site
4. **Sample Query:** Fetches sample values to determine value types
5. **Classification:** Classifies each measurement using domain context

### Cache Structure

The cache is stored in `schemaCache.measurements` as a Map:

```javascript
schemaCache.measurements.set(measurementName, {
  name: string,           // Measurement name
  count: number,          // Data points in last 24h
  lastSeen: string,       // ISO timestamp
  valueType: string,      // 'numeric' or 'string'
  sampleValues: array,    // Up to 3 sample values
  enterprises: string[],  // Enterprises using this measurement
  sites: string[],        // Sites using this measurement
  classification: string  // Category (oee_metric, sensor_reading, etc.)
});
```

### Usage Example

```javascript
const { refreshSchemaCache } = require('./lib/schema');
const { schemaCache } = require('./lib/state');

await refreshSchemaCache();

// Access cached measurements
for (const [name, meta] of schemaCache.measurements) {
  console.log(`${name}: ${meta.count} points, type=${meta.valueType}`);
}
```

## Function: refreshHierarchyCache

Builds a hierarchical tree structure from InfluxDB data.

### Hierarchy Structure

```javascript
{
  "Enterprise A": {
    totalCount: 50000,
    sites: {
      "Dallas Line 1": {
        totalCount: 25000,
        areas: {
          "packaging": {
            totalCount: 10000,
            machines: {
              "wrapper01": {
                totalCount: 5000,
                measurements: ["speed_metric", "count_total", ...]
              }
            }
          }
        }
      }
    }
  }
}
```

### Usage Example

```javascript
const { refreshHierarchyCache } = require('./lib/schema');
const { schemaCache } = require('./lib/state');

await refreshHierarchyCache();

// Navigate the hierarchy
const hierarchy = schemaCache.hierarchy;
const enterpriseA = hierarchy['Enterprise A'];
const sites = Object.keys(enterpriseA.sites);
console.log(`Enterprise A has ${sites.length} sites`);
```

## Function: classifyMeasurementDetailed

Classifies measurements based on name patterns and value characteristics.

### Classification Categories

| Category | Example Patterns |
|----------|-----------------|
| `oee_metric` | oee, OEE_Performance, availability, quality |
| `sensor_reading` | speed, temperature, pressure, humidity |
| `state_status` | state, status, running, fault, alarm |
| `counter` | count, total, produced, rejected, scrap |
| `timing` | time, duration, cycle, downtime, uptime |
| `percentage_metric` | Values in 0-100 range |
| `description` | String values (fallback) |
| `unknown` | Unclassified |

### Usage Example

```javascript
const { classifyMeasurementDetailed } = require('./lib/schema');

const category = classifyMeasurementDetailed(
  'furnace_temperature',
  'numeric',
  [2650, 2700, 2680]
);
// Returns: 'sensor_reading'
```

## Caching Strategy

### Cache TTL

Both caches have a 5-minute TTL defined in `schemaCache`:

```javascript
schemaCache.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

### Concurrency Control

Both functions use promise-based locks to prevent race conditions:

```javascript
// If refresh in progress, wait for it instead of starting another
if (schemaRefreshInProgress) {
  await schemaRefreshInProgress;
  return;
}
```

## Flux Queries Used

### Measurement Count Query

```flux
from(bucket: "factory")
  |> range(start: -24h)
  |> filter(fn: (r) => r._field == "value")
  |> group(columns: ["_measurement", "enterprise", "site"])
  |> count()
```

### Sample Values Query (per measurement)

```flux
from(bucket: "factory")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> filter(fn: (r) => r._field == "value")
  |> limit(n: 3)
```

### Hierarchy Query

```flux
from(bucket: "factory")
  |> range(start: -24h)
  |> filter(fn: (r) => r._field == "value")
  |> group(columns: ["enterprise", "site", "area", "machine", "_measurement"])
  |> count()
  |> group()
```

## API Endpoints

The schema module powers these REST endpoints:

| Endpoint | Handler |
|----------|---------|
| `GET /api/schema/measurements` | Returns `schemaCache.measurements` as JSON |
| `GET /api/schema/hierarchy` | Returns `schemaCache.hierarchy` as JSON |

### Example Response: /api/schema/measurements

```json
{
  "speed_metric": {
    "name": "speed_metric",
    "count": 12500,
    "lastSeen": "2026-01-14T18:30:00.000Z",
    "valueType": "numeric",
    "sampleValues": [450.5, 448.2, 452.1],
    "enterprises": ["Enterprise A"],
    "sites": ["Dallas Line 1"],
    "classification": "sensor_reading"
  }
}
```

## Related Modules

| Module | Relationship |
|--------|--------------|
| [Module-Influx-Client](Module-Influx-Client) | Provides `queryApi` for InfluxDB queries |
| [Module-OEE](Module-OEE) | Calls `refreshSchemaCache()` before OEE discovery |

## Performance Considerations

- Sample value queries run in parallel batches of 10 to avoid overwhelming InfluxDB
- Hierarchy building aggregates counts up the tree for efficient totals
- Both caches use synchronous Set/Map operations for O(1) lookups

## See Also

- [Data Flow Diagrams](Data-Flow-Diagrams)
- [Factory Enterprises Explained](Factory-Enterprises-Explained)
