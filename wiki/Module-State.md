# Module: State

**Source:** `lib/state.js`

Centralized state management for the EdgeMind factory intelligence dashboard.

## Purpose

Provides shared state objects that multiple modules can read and modify. Manages real-time factory data, AI-generated insights, schema discovery caches, and equipment state tracking.

## Key Exports

| Name | Type | Description |
|------|------|-------------|
| `factoryState` | `FactoryState` | Real-time messages, anomalies, insights, and statistics |
| `schemaCache` | `SchemaCache` | Cached measurement metadata and topic hierarchy |
| `equipmentStateCache` | `EquipmentStateCache` | Equipment state tracking (DOWN/IDLE/RUNNING) |

## State Objects

### factoryState

Stores real-time factory data and Claude-generated insights.

```javascript
const factoryState = {
  messages: [],           // Recent MQTT messages (array)
  anomalies: [],          // Detected anomalies (array)
  insights: [],           // Claude-generated insights (array)
  trendInsights: [],      // Trend analysis results (array)
  anomalyFilters: [],     // User-defined filter rules (array)
  thresholdSettings: {
    oeeBaseline: 70,        // % - below this is concerning
    oeeWorldClass: 85,      // % - above this is excellent
    availabilityMin: 65,    // % - below this is critical
    defectRateWarning: 2,   // % - above this triggers warning
    defectRateCritical: 5   // % - above this triggers critical
  },
  stats: {
    messageCount: 0,        // Total MQTT messages received
    anomalyCount: 0,        // Total anomalies detected
    lastUpdate: null,       // Timestamp of last message
    influxWrites: 0         // Total writes to InfluxDB
  }
};
```

### schemaCache

Caches measurement metadata and hierarchical topic structure for performance.

```javascript
const schemaCache = {
  measurements: new Map(),    // measurement name -> metadata
  lastRefresh: null,          // Last cache refresh timestamp
  hierarchy: null,            // Enterprise -> Site -> Area -> Machine tree
  lastHierarchyRefresh: null, // Last hierarchy refresh timestamp
  knownMeasurements: new Set(), // Track seen measurements
  CACHE_TTL_MS: 5 * 60 * 1000   // 5 minutes TTL
};
```

**Measurement Metadata Structure:**

```javascript
{
  count: number,           // Number of data points
  lastSeen: Date,          // Last observation timestamp
  valueType: string,       // 'numeric', 'string', etc.
  sampleValues: Array,     // Sample values for reference
  enterprises: Set,        // Enterprises using this measurement
  sites: Set               // Sites using this measurement
}
```

### equipmentStateCache

Caches equipment operational states with defined state codes.

```javascript
const equipmentStateCache = {
  states: new Map(),           // Map<equipmentKey, stateData>
  CACHE_TTL_MS: 60 * 1000,     // 1 minute TTL
  STATE_CODES: {
    1: { name: 'DOWN', color: 'red', priority: 3 },
    2: { name: 'IDLE', color: 'yellow', priority: 2 },
    3: { name: 'RUNNING', color: 'green', priority: 1 }
  }
};
```

## Usage Examples

### Accessing Factory Statistics

```javascript
const { factoryState } = require('./lib/state');

// Read statistics
console.log(`Messages received: ${factoryState.stats.messageCount}`);
console.log(`Last update: ${factoryState.stats.lastUpdate}`);

// Update statistics
factoryState.stats.messageCount++;
factoryState.stats.lastUpdate = new Date();
```

### Adding Insights

```javascript
const { factoryState } = require('./lib/state');

// Add a new trend insight
factoryState.trendInsights.push({
  timestamp: new Date(),
  analysis: 'OEE declining across Enterprise A sites',
  severity: 'warning'
});

// Keep only recent insights (last 50)
if (factoryState.trendInsights.length > 50) {
  factoryState.trendInsights.shift();
}
```

### Working with Schema Cache

```javascript
const { schemaCache } = require('./lib/state');

// Check if cache is stale
function isCacheStale() {
  if (!schemaCache.lastRefresh) return true;
  const age = Date.now() - schemaCache.lastRefresh.getTime();
  return age > schemaCache.CACHE_TTL_MS;
}

// Get measurement metadata
function getMeasurementInfo(name) {
  return schemaCache.measurements.get(name);
}

// Update measurement metadata
function updateMeasurement(name, metadata) {
  schemaCache.measurements.set(name, metadata);
  schemaCache.knownMeasurements.add(name);
}
```

### Equipment State Lookups

```javascript
const { equipmentStateCache } = require('./lib/state');

// Get state definition
function getStateInfo(stateCode) {
  return equipmentStateCache.STATE_CODES[stateCode];
}

// Example: state code 1
getStateInfo(1);
// { name: 'DOWN', color: 'red', priority: 3 }

// Cache equipment state
function cacheEquipmentState(key, data) {
  equipmentStateCache.states.set(key, {
    ...data,
    cachedAt: Date.now()
  });
}

// Check if cached state is valid
function isStateCacheValid(key) {
  const cached = equipmentStateCache.states.get(key);
  if (!cached) return false;
  return (Date.now() - cached.cachedAt) < equipmentStateCache.CACHE_TTL_MS;
}
```

### Using Threshold Settings

```javascript
const { factoryState } = require('./lib/state');

function evaluateOEE(oeeValue) {
  const { oeeBaseline, oeeWorldClass } = factoryState.thresholdSettings;

  if (oeeValue >= oeeWorldClass) {
    return { status: 'excellent', color: 'green' };
  } else if (oeeValue >= oeeBaseline) {
    return { status: 'acceptable', color: 'yellow' };
  } else {
    return { status: 'concerning', color: 'red' };
  }
}
```

## State Architecture

```
                    +-----------------+
                    |   server.js     |
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
     +--------+----+  +------+------+  +----+--------+
     | factoryState|  | schemaCache |  | equipState  |
     +--------+----+  +------+------+  +----+--------+
              ^              ^              ^
              |              |              |
    +---------+    +---------+    +--------+
    |              |              |
+---+---+    +-----+-----+    +---+---+
| MQTT  |    |  Schema   |    |  OEE  |
| Writer|    |  Module   |    | Module|
+-------+    +-----------+    +-------+
```

## Cache TTL Values

| Cache | TTL | Purpose |
|-------|-----|---------|
| `schemaCache` | 5 minutes | Measurement metadata, topic hierarchy |
| `equipmentStateCache` | 1 minute | Equipment operational states |

## Thread Safety Note

Node.js is single-threaded, so these state objects are safe to access without locks. However, async operations should be careful about state mutations during await points.

## Related Modules

- [[Module-Config]] - Configuration values used by state
- [[Module-Validation]] - Validates data before storing in state
- [[Module-Domain-Context]] - Domain knowledge for interpreting state
- `lib/schema/index.js` - Populates schemaCache
- `lib/ai/index.js` - Reads/writes factoryState
- `lib/oee/index.js` - Uses schemaCache and equipmentStateCache
