# Module: OEE

**Source:** `lib/oee/index.js`

## Purpose

Calculates Overall Equipment Effectiveness (OEE) using a tiered strategy that adapts to available data. This is the most complex module in EdgeMind, handling multiple calculation methods depending on what each enterprise provides.

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `OEE_TIERS` | Object | Tier definitions (1-4) |
| `OEE_PATTERNS` | Object | Regex patterns for OEE discovery |
| `oeeConfig` | Object | Runtime OEE configuration |
| `discoverOEESchema` | Function | Discovers OEE measurements per enterprise |
| `analyzeEnterpriseOEE` | Function | Determines calculation tier for an enterprise |
| `calculateOEEv2` | Function | Main OEE calculation function |
| `createOEEResult` | Function | Creates standardized OEE result objects |
| `queryOEE` | Function | Legacy OEE query |
| `queryOEEBreakdown` | Function | OEE by enterprise |
| `queryFactoryStatus` | Function | Hierarchical OEE status |

## OEE Tier System

EdgeMind uses a tiered approach because different factories provide OEE data differently.

### Tier Definitions

| Tier | Name | Description | Confidence |
|------|------|-------------|------------|
| 1 | `pre-computed-overall` | Factory provides pre-calculated OEE | 95% |
| 2 | `pre-computed-components` | Factory provides A, P, Q separately | 90% |
| 3 | `calculated-from-raw` | Calculate from raw production data | 70% |
| 4 | `insufficient-data` | Cannot calculate OEE | 0% |

### Tier Selection Logic

```
Has 'metric_oee' or 'OEE' measurement? ─── YES ──> Tier 1
              │
              NO
              │
              v
Has availability + performance + quality? ─── YES ──> Tier 2
              │
              NO
              │
              v
                                               Tier 4 (insufficient)
```

## Function: discoverOEESchema

Analyzes all measurements to determine what OEE data each enterprise provides.

### Process

1. Calls `refreshSchemaCache()` to ensure fresh measurement data
2. Groups measurements by enterprise
3. Analyzes each enterprise with `analyzeEnterpriseOEE()`
4. Populates `oeeConfig.enterprises`

### Usage Example

```javascript
const { discoverOEESchema, oeeConfig } = require('./lib/oee');

const discovered = await discoverOEESchema();

console.log(discovered);
// {
//   "Enterprise A": { tier: 1, measurements: { overall: 'metric_oee' }, ... },
//   "Enterprise B": { tier: 2, measurements: { availability: 'OEE_Availability', ... } }
// }
```

## Function: analyzeEnterpriseOEE

Determines the OEE calculation tier for a single enterprise.

### OEE Patterns Matched

```javascript
const OEE_PATTERNS = {
  overall: [/^oee$/i, /metric_oee/i, /oee_overall/i],
  availability: [/oee_availability/i, /availability/i],
  performance: [/oee_performance/i, /performance/i],
  quality: [/oee_quality/i, /quality/i]
};
```

### Value Format Detection

The function inspects sample values to determine if OEE is stored as:
- **Decimal:** 0.0 - 1.0 (converted to percentage)
- **Percentage:** 0 - 100

### Return Structure

```javascript
{
  tier: 1,                        // Calculation tier
  measurements: {                 // Found measurements
    overall: 'metric_oee',
    availability: null,
    performance: null,
    quality: null
  },
  valueFormat: 'percentage',      // 'decimal' or 'percentage'
  sites: ['Dallas Line 1', ...],  // Available sites
  lastDiscovery: '2026-01-14T18:30:00.000Z',
  confidence: 0.95,
  reason: 'Using pre-computed OEE from metric_oee'
}
```

## Function: calculateOEEv2

Main OEE calculation function using the tiered strategy.

### Signature

```javascript
async function calculateOEEv2(enterprise: string, site: string|null): Promise<Object>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `enterprise` | string | Enterprise name (e.g., 'Enterprise A') |
| `site` | string\|null | Optional site filter |

### Usage Example

```javascript
const { calculateOEEv2 } = require('./lib/oee');

const result = await calculateOEEv2('Enterprise A', null);

console.log(result);
// {
//   enterprise: 'Enterprise A',
//   site: null,
//   oee: 82.5,
//   components: null,  // Tier 1 doesn't calculate components
//   calculation: {
//     tier: 1,
//     tierName: 'pre-computed-overall',
//     method: 'Using pre-computed OEE from metric_oee',
//     measurementsUsed: ['metric_oee'],
//     dataPoints: 1,
//     timeRange: { start: '-24h', end: 'now()' }
//   },
//   quality: { confidence: 0.95, status: 'good' },
//   timestamp: '2026-01-14T18:30:00.000Z'
// }
```

## Tier 1 Calculation

Uses pre-computed OEE values directly from the database.

### Flux Query

```flux
from(bucket: "factory")
  |> range(start: -24h)
  |> filter(fn: (r) => r._field == "value")
  |> filter(fn: (r) => r._measurement == "metric_oee")
  |> filter(fn: (r) => r.enterprise == "Enterprise A")
  |> filter(fn: (r) => r._value > 0)
  |> mean()
```

### Value Normalization

```javascript
// Convert decimal to percentage if needed
if (oeeValue !== null && config.valueFormat === 'decimal') {
  oeeValue = oeeValue * 100;
}
// Clamp to valid range
oeeValue = Math.min(100, Math.max(0, oeeValue));
```

## Tier 2 Calculation

Calculates OEE from Availability, Performance, and Quality components.

### Formula

```
OEE = Availability x Performance x Quality
```

Where each component is queried separately and normalized to percentage.

### Component Queries

All three components are queried in parallel:

```javascript
const [availability, performance, quality] = await Promise.all([
  queryComponent(availMeasure),
  queryComponent(perfMeasure),
  queryComponent(qualMeasure)
]);
```

### Result with Components

```javascript
{
  oee: 75.8,
  components: {
    availability: 92.5,
    performance: 88.2,
    quality: 92.9
  },
  calculation: {
    tier: 2,
    tierName: 'pre-computed-components',
    method: 'Calculating from A x P x Q components'
  }
}
```

## Function: createOEEResult

Creates a standardized OEE result object.

### Signature

```javascript
function createOEEResult(
  enterprise: string,
  site: string|null,
  oee: number|null,
  components: Object|null,
  tier: number,
  reason: string,
  meta?: Object
): Object
```

## Legacy Query Functions

These functions support the original API endpoints.

### queryOEE(enterprise)

Returns 24-hour average OEE for a single enterprise or all enterprises.

```javascript
const result = await queryOEE('A');
// { average: 82.5, period: '24h', enterprise: 'A', dataPoints: 1 }

const allResult = await queryOEE('ALL');
// { average: 78.3, period: '24h', enterprise: 'ALL', dataPoints: 3 }
```

### queryOEEBreakdown()

Returns OEE grouped by enterprise.

```javascript
const breakdown = await queryOEEBreakdown();
// {
//   period: '24h',
//   data: {
//     'Enterprise A': { oee: 82.5, dataPoints: 1 },
//     'Enterprise B': { oee: 74.2, dataPoints: 1 }
//   }
// }
```

### queryFactoryStatus()

Returns hierarchical OEE with health status.

```javascript
const status = await queryFactoryStatus();
// {
//   enterprises: [
//     {
//       name: 'Enterprise A',
//       oee: 82.5,
//       status: 'healthy',  // >= 80%
//       sites: [
//         { name: 'Dallas Line 1', oee: 85.0, status: 'healthy' },
//         { name: 'Houston Line 2', oee: 72.0, status: 'warning' }
//       ]
//     }
//   ]
// }
```

### Health Status Thresholds

| OEE Range | Status |
|-----------|--------|
| >= 80% | healthy |
| 60-79% | warning |
| < 60% | critical |

## API Endpoints

| Endpoint | Function | Description |
|----------|----------|-------------|
| `GET /api/oee?enterprise=A` | `queryOEE()` | Legacy single enterprise |
| `GET /api/oee/breakdown` | `queryOEEBreakdown()` | By enterprise |
| `GET /api/factory/status` | `queryFactoryStatus()` | Hierarchical |
| `GET /api/oee/v2?enterprise=...&site=...` | `calculateOEEv2()` | New tiered API |
| `GET /api/oee/discovery` | `discoverOEESchema()` | Schema info |

## Runtime Configuration

```javascript
const oeeConfig = {
  defaults: {
    staleDataThreshold: 300000,         // 5 minutes
    decimalToPercentThreshold: 1.5      // Values <= 1.5 are decimal format
  },
  enterprises: {}  // Populated by discoverOEESchema()
};
```

## Related Modules

| Module | Relationship |
|--------|--------------|
| [Module-Influx-Client](Module-Influx-Client) | Provides `queryApi` |
| [Module-Schema](Module-Schema) | Provides `refreshSchemaCache()` |

## Enterprise-Specific Notes

### Enterprise A (Glass Manufacturing)
- Uses Tier 1: Pre-computed `metric_oee`
- Values in percentage format (0-100)

### Enterprise B (Beverage Bottling)
- Uses Tier 2: Separate A, P, Q components
- Values may be in decimal format (0-1)

### Enterprise C (Bioprocessing)
- Often Tier 4: Batch-based, OEE not applicable
- Uses batch efficiency metrics instead

## See Also

- [Factory Enterprises Explained](Factory-Enterprises-Explained)
- [Data Flow Diagrams](Data-Flow-Diagrams)
