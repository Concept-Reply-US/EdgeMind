# Vendor Data Pollution Fix

## Summary

Fixed vendor data pollution across 5 critical points by implementing a site allowlist that filters out vendor integration endpoints (prosys, opto22, maintainx, hivemq, broker, etc.) from equipment states, OEE calculations, and line status queries.

## Problem

Vendor integration sites were polluting:
1. Equipment state cache (server.js ~line 407)
2. `/api/equipment/states` endpoint (server.js ~line 1034)
3. `/api/oee/lines` Flux query (server.js ~line 1133)
4. `/api/agent/context` equipment states (server.js ~line 1862)
5. OEE factory status queries (lib/oee/index.js ~line 650)

## Solution

### 1. Created Site Allowlist Configuration

**File:** `/config/factory-sites.json`

```json
{
  "description": "Real factory sites allowlist. Only data from these sites is tracked for equipment states, OEE, and line status.",
  "sites": {
    "Enterprise A": ["Dallas Line 1", "Dallas"],
    "Enterprise B": ["Site1", "Site2", "Site3"],
    "Enterprise C": []
  },
  "allSites": ["Dallas Line 1", "Dallas", "Site1", "Site2", "Site3"]
}
```

Note: Enterprise A includes both "Dallas Line 1" (full name) and "Dallas" (short name) to handle topic variations.

### 2. Created Factory Sites Module

**File:** `/lib/factory-sites.js`

Exports:
- `isRealSite(site)` - Returns true if site is in the allowlist
- `getRealSites()` - Returns array of all real factory sites
- `getRealSitesForEnterprise(enterprise)` - Returns sites for a specific enterprise
- `getFluxSiteFilter()` - Returns Flux filter string for real sites only

### 3. Applied Fixes to All 5 Pollution Points

#### Point 1: Equipment State Cache Ingestion (server.js ~line 411)

```javascript
const site = parts[1];

// Skip vendor integration sites (not real factory sites)
if (!isRealSite(site)) {
  // Continue with InfluxDB write, but skip equipment state caching
  return;
}
```

#### Point 2: `/api/equipment/states` Endpoint (server.js ~line 1047)

```javascript
for (const stateData of equipmentStateCache.states.values()) {
  // Skip vendor integration sites (not real factory sites)
  if (!isRealSite(stateData.site)) {
    continue;
  }
  // ... rest of iteration
}
```

#### Point 3: `/api/oee/lines` Flux Query (server.js ~line 1159)

```javascript
const fluxQuery = `
  from(bucket: "${CONFIG.influxdb.bucket}")
    |> range(start: -24h)
    |> filter(fn: (r) => r._field == "value")
    |> filter(fn: (r) => ...)
    |> filter(fn: (r) => r._value > 0 and r._value <= 150)
    ${enterpriseFilter}
    ${getFluxSiteFilter()}  // <-- ADDED
    |> group(columns: ["enterprise", "site", "area", "_measurement"])
    ...
`;
```

#### Point 4: `/api/agent/context` Equipment States (server.js ~line 1865)

```javascript
const getEquipmentStates = () => {
  const states = [];
  const now = Date.now();
  for (const stateData of equipmentStateCache.states.values()) {
    // Skip vendor integration sites (not real factory sites)
    if (!isRealSite(stateData.site)) {
      continue;
    }
    states.push({...});
  }
  return states;
};
```

#### Point 5: OEE Factory Status Queries (lib/oee/index.js)

Applied `getFluxSiteFilter()` to:
- `queryFactoryStatus` Flux query (~line 652)
- `calculateTier1` main query (~line 349)
- `calculateTier1` component queries (~line 394)
- `calculateTier2` component queries (~line 465)

## Testing

Created comprehensive test suite: `/lib/__tests__/factory-sites.test.js`

- 11 new tests covering all module functions
- Tests verify vendor sites are excluded
- Tests verify real sites are included
- Tests verify Flux filter generation

**Test Results:**
- All 424 tests pass (up from 413)
- Factory-sites module: 11/11 tests pass
- No regressions in existing tests

## Important Notes

1. **InfluxDB writes still happen for vendor sites** - Only the in-memory caching and queries are filtered
2. **Enterprise A site variations** - Both "Dallas Line 1" and "Dallas" are included to handle topic inconsistencies
3. **Enterprise C has no sites** - Uses ISA-88 batch control instead of OEE
4. **Config is cached** - First read loads from JSON, subsequent calls use cached version

## Files Changed

1. `/config/factory-sites.json` (created)
2. `/lib/factory-sites.js` (created)
3. `/lib/__tests__/factory-sites.test.js` (created)
4. `/server.js` (4 fixes)
5. `/lib/oee/index.js` (4 fixes)

## Verification

Run tests to verify:
```bash
npm test
```

Expected: All 424 tests pass
