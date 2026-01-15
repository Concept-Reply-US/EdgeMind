# Module: Domain Context

**Source:** `lib/domain-context.js`

Domain-specific knowledge and measurement classification for factory intelligence analysis.

## Purpose

Provides industry-specific context for each enterprise (Glass Manufacturing, Beverage Bottling, Bioprocessing) including equipment specifications, safety ranges, and waste thresholds. Enables Claude AI to generate domain-aware insights rather than generic observations.

## Key Exports

### Constants

| Name | Type | Description |
|------|------|-------------|
| `MEASUREMENT_CLASSIFICATIONS` | `Object` | Categories for auto-classifying measurements |
| `ENTERPRISE_DOMAIN_CONTEXT` | `Object` | Industry-specific context per enterprise |

### Functions

| Name | Signature | Description |
|------|-----------|-------------|
| `classifyMeasurement` | `(name: string) => {category, confident}` | Auto-classify measurement by name pattern |
| `getEnterpriseContext` | `(name: string) => Object\|null` | Get domain context for an enterprise |
| `getEnterpriseNames` | `() => string[]` | Get all enterprise names |
| `isWasteMetric` | `(measurement, enterprise) => boolean` | Check if measurement tracks waste |

## MEASUREMENT_CLASSIFICATIONS

Categories for automatic measurement classification based on naming patterns.

| Category | Patterns | Description |
|----------|----------|-------------|
| `oee_metric` | oee, OEE_Performance, OEE_Availability, OEE_Quality, availability, performance, quality | OEE and related efficiency metrics |
| `sensor_reading` | speed, temperature, pressure, humidity, voltage, current, flow, level, weight | Physical sensor measurements |
| `state_status` | state, status, running, stopped, fault, alarm, mode, ready | Equipment operational states |
| `counter` | count, total, produced, rejected, scrap, waste, good | Production counters |
| `timing` | time, duration, cycle, downtime, uptime, runtime | Time-based metrics |
| `description` | *(fallback)* | String values and unclassified measurements |

## ENTERPRISE_DOMAIN_CONTEXT

### Enterprise A - Glass Manufacturing

```javascript
{
  industry: 'Glass Manufacturing',
  domain: 'glass',
  equipment: {
    'Furnace': { type: 'glass-furnace', normalTemp: [2650, 2750], unit: '°F' },
    'ISMachine': { type: 'forming-machine', cycleTime: [8, 12], unit: 'sec' },
    'Lehr': { type: 'annealing-oven', tempGradient: [1050, 400] }
  },
  criticalMetrics: ['temperature', 'gob_weight', 'defect_count'],
  concerns: ['thermal_shock', 'crown_temperature', 'refractory_wear'],
  safeRanges: {
    'furnace_temp': { min: 2600, max: 2800, unit: '°F', critical: true },
    'crown_temp': { min: 2400, max: 2600, unit: '°F' }
  },
  wasteMetrics: ['OEE_Waste', 'Production_DefectCHK', 'Production_DefectDIM',
                 'Production_DefectSED', 'Production_RejectCount'],
  wasteThresholds: { warning: 10, critical: 25, unit: 'defects/hr' }
}
```

### Enterprise B - Beverage Bottling

```javascript
{
  industry: 'Beverage Bottling',
  domain: 'beverage',
  equipment: {
    'Filler': { type: 'bottle-filler', normalSpeed: [400, 600], unit: 'BPM' },
    'Labeler': { type: 'labeling-machine', accuracy: 99.5 },
    'Palletizer': { type: 'palletizing-robot', cycleTime: [10, 15] }
  },
  criticalMetrics: ['countinfeed', 'countoutfeed', 'countdefect', 'oee'],
  concerns: ['line_efficiency', 'changeover_time', 'reject_rate'],
  rawCounterFields: ['countinfeed', 'countoutfeed', 'countdefect'],
  safeRanges: {
    'reject_rate': { max: 2, unit: '%', warning: 1.5 },
    'filler_speed': { min: 350, max: 650, unit: 'BPM' }
  },
  wasteMetrics: ['count_defect', 'input_countdefect', 'workorder_quantitydefect'],
  wasteThresholds: { warning: 50, critical: 100, unit: 'defects/hr' }
}
```

### Enterprise C - Bioprocessing / Pharma

```javascript
{
  industry: 'Bioprocessing / Pharma',
  domain: 'pharma',
  batchControl: 'ISA-88',
  equipment: {
    'SUM': { type: 'single-use-mixer', phase: 'preparation' },
    'SUB': { type: 'single-use-bioreactor', phase: 'cultivation' },
    'CHROM': { type: 'chromatography', phase: 'purification' },
    'TFF': { type: 'tangential-flow-filtration', phase: 'filtration' }
  },
  criticalMetrics: ['PV_percent', 'phase', 'batch_id'],
  concerns: ['contamination', 'batch_deviation', 'sterility'],
  safeRanges: {
    'pH': { min: 6.8, max: 7.4, critical: true },
    'dissolved_oxygen': { min: 30, max: 70, unit: '%' }
  },
  wasteMetrics: ['chrom_CHR01_WASTE_PV'],
  wasteThresholds: { warning: 5, critical: 15, unit: 'L' }
}
```

## Usage Examples

### Classifying Measurements

```javascript
const { classifyMeasurement } = require('./lib/domain-context');

// Exact pattern match
classifyMeasurement('machine_oee');
// { category: 'oee_metric', confident: true }

// Sensor reading
classifyMeasurement('furnace_temperature');
// { category: 'sensor_reading', confident: true }

// Counter metric
classifyMeasurement('production_count_good');
// { category: 'counter', confident: true }

// Unknown measurement
classifyMeasurement('custom_field_xyz');
// { category: 'description', confident: false }
```

### Getting Enterprise Context

```javascript
const { getEnterpriseContext, getEnterpriseNames } = require('./lib/domain-context');

// Get all enterprises
getEnterpriseNames();
// ['Enterprise A', 'Enterprise B', 'Enterprise C']

// Get specific context
const glassCtx = getEnterpriseContext('Enterprise A');
console.log(glassCtx.industry);     // 'Glass Manufacturing'
console.log(glassCtx.criticalMetrics); // ['temperature', 'gob_weight', 'defect_count']

// Unknown enterprise
getEnterpriseContext('Enterprise Z'); // null
```

### Checking Waste Metrics

```javascript
const { isWasteMetric } = require('./lib/domain-context');

// Glass manufacturing waste
isWasteMetric('OEE_Waste', 'Enterprise A');        // true
isWasteMetric('Production_DefectCHK', 'Enterprise A'); // true
isWasteMetric('temperature', 'Enterprise A');      // false

// Beverage bottling waste
isWasteMetric('count_defect', 'Enterprise B');     // true
isWasteMetric('oee', 'Enterprise B');              // false
```

### Using Context for AI Insights

```javascript
const { getEnterpriseContext, ENTERPRISE_DOMAIN_CONTEXT } = require('./lib/domain-context');

function buildAIPrompt(enterprise, measurement, value) {
  const ctx = getEnterpriseContext(enterprise);
  if (!ctx) return null;

  // Check if value is in safe range
  const range = ctx.safeRanges[measurement];
  let concern = null;

  if (range) {
    if (range.min && value < range.min) {
      concern = `below minimum (${range.min}${range.unit || ''})`;
    }
    if (range.max && value > range.max) {
      concern = `above maximum (${range.max}${range.unit || ''})`;
    }
  }

  return {
    industry: ctx.industry,
    equipment: ctx.equipment,
    concern,
    relatedConcerns: ctx.concerns
  };
}
```

### Evaluating Waste Thresholds

```javascript
const { getEnterpriseContext } = require('./lib/domain-context');

function evaluateWasteLevel(enterprise, wasteValue) {
  const ctx = getEnterpriseContext(enterprise);
  if (!ctx || !ctx.wasteThresholds) return 'unknown';

  const { warning, critical, unit } = ctx.wasteThresholds;

  if (wasteValue >= critical) {
    return { level: 'critical', message: `${wasteValue} ${unit} exceeds critical threshold` };
  } else if (wasteValue >= warning) {
    return { level: 'warning', message: `${wasteValue} ${unit} exceeds warning threshold` };
  }
  return { level: 'normal', message: `${wasteValue} ${unit} within limits` };
}

// Usage
evaluateWasteLevel('Enterprise A', 30);
// { level: 'critical', message: '30 defects/hr exceeds critical threshold' }
```

## How Domain Knowledge is Used

```
                    +------------------+
                    | MQTT Message     |
                    | Topic: Ent A/... |
                    | Value: 2850      |
                    +--------+---------+
                             |
                             v
              +--------------+--------------+
              |     Domain Context          |
              | getEnterpriseContext('A')   |
              +--------------+--------------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+--------+--------+ +--------+--------+ +--------+--------+
| Equipment Type  | | Safe Ranges     | | Waste Thresholds|
| glass-furnace   | | temp: 2600-2800 | | critical: 25/hr |
+-----------------+ +--------+--------+ +-----------------+
                             |
                             v
                    +--------+--------+
                    | AI Analysis     |
                    | "Furnace temp   |
                    | 2850°F exceeds  |
                    | max 2800°F -    |
                    | thermal shock   |
                    | risk"           |
                    +-----------------+
```

## Related Modules

- [[Module-Config]] - Configuration settings
- [[Module-Validation]] - Validates enterprise names
- [[Module-State]] - Stores classified measurements
- `lib/ai/index.js` - Uses domain context for Claude prompts
- `lib/oee/index.js` - Uses equipment specifications
- `lib/schema/index.js` - Uses classification for schema discovery
