// lib/spc/index.js - Statistical Process Control Module

const { queryApi } = require('../influx/client');
const CONFIG = require('../config');
const { sanitizeInfluxIdentifier } = require('../validation');
const { schemaCache } = require('../state');
const { refreshSchemaCache } = require('../schema');
const { TIME_WINDOWS, validateTimeWindow } = require('../trends');

/**
 * Calculate Process Capability Index (Cpk)
 * Cpk = min((USL - μ) / 3σ, (μ - LSL) / 3σ)
 * @param {Array} measurements - Array of measurement values
 * @param {number} lsl - Lower Specification Limit
 * @param {number} usl - Upper Specification Limit
 * @returns {number} Cpk value
 */
function calculateCpk(measurements, lsl, usl) {
  if (!measurements || measurements.length < 2) return 0;

  // Calculate mean
  const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;

  // Calculate standard deviation with Bessel's correction (Issue #15)
  const squaredDiffs = measurements.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (measurements.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Calculate Cpk
  const cpkUpper = (usl - mean) / (3 * stdDev);
  const cpkLower = (mean - lsl) / (3 * stdDev);

  // Issue #4 fix: Clamp Cpk to minimum of 0 (negative Cpk means process mean is outside spec limits)
  return Math.max(0, Math.min(cpkUpper, cpkLower));
}

/**
 * Calculate statistical measures for a dataset
 * @param {Array} measurements - Array of measurement values
 * @returns {Object} {mean, stdDev, variance, min, max, count}
 */
function calculateStatistics(measurements) {
  if (!measurements || measurements.length === 0) {
    return { mean: 0, stdDev: 0, variance: 0, min: 0, max: 0, count: 0 };
  }

  const count = measurements.length;

  // Guard against single data point (Issue #15)
  if (count === 1) {
    return {
      mean: measurements[0],
      stdDev: 0,
      variance: 0,
      min: measurements[0],
      max: measurements[0],
      count: 1
    };
  }

  const mean = measurements.reduce((sum, val) => sum + val, 0) / count;
  const squaredDiffs = measurements.map(val => Math.pow(val - mean, 2));
  // Issue #15 fix: Use Bessel's correction (sample variance) - divide by N-1 instead of N
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (count - 1);
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...measurements);
  const max = Math.max(...measurements);

  return { mean, stdDev, variance, min, max, count };
}

/**
 * Detect out-of-control points using Western Electric rules
 * Rule 1: Any point beyond 3σ from the mean (UCL/LCL)
 * @param {Array} measurements - Array of {timestamp, value} objects
 * @param {number} mean - Process mean
 * @param {number} stdDev - Process standard deviation
 * @returns {Array} Array of out-of-control points
 */
function detectOutOfControl(measurements, mean, stdDev) {
  if (!measurements || measurements.length === 0) return [];

  const ucl = mean + 3 * stdDev;
  const lcl = mean - 3 * stdDev;

  return measurements.map((point, index) => {
    const value = typeof point === 'object' ? point.value : point;
    const outOfControl = value > ucl || value < lcl;
    const violationType = value > ucl ? 'upper' : (value < lcl ? 'lower' : null);

    return {
      index,
      timestamp: typeof point === 'object' ? point.timestamp : null,
      value,
      outOfControl,
      violationType
    };
  }).filter(p => p.outOfControl);
}

/**
 * Calculate problematic score for a measurement
 * Score based on: variance, Cpk, out-of-control count
 * @param {Object} stats - Statistics object
 * @param {number} cpk - Cpk value
 * @param {number} outOfControlCount - Number of out-of-control points
 * @returns {number} Score 0-1 (higher = more problematic)
 */
function calculateProblematicScore(stats, cpk, outOfControlCount) {
  // Cpk score (1 - normalized Cpk, where <1 is problematic)
  const cpkScore = cpk < 1.33 ? (1.33 - cpk) / 1.33 : 0;

  // Variance score (coefficient of variation)
  const cvScore = stats.mean !== 0 ? Math.min(1, (stats.stdDev / Math.abs(stats.mean)) / 0.2) : 0;

  // Out-of-control score (percentage of total points)
  const outOfControlScore = stats.count > 0 ? Math.min(1, outOfControlCount / stats.count) : 0;

  // Weighted average
  const score = (cpkScore * 0.4) + (cvScore * 0.3) + (outOfControlScore * 0.3);

  return Math.min(1, Math.max(0, score));
}

/**
 * Apply the SPC candidate blocklist filter to a measurement
 * Reused by both discoverSPCMeasurements and discoverSPCSites
 * @param {Object} m - Measurement from schema cache
 * @param {string} enterprise - Enterprise filter
 * @returns {boolean} True if measurement is SPC-eligible
 */
function isSPCCandidate(m, enterprise) {
  if (!m.enterprises.includes(enterprise)) return false;
  if (m.valueType !== 'numeric') return false;

  const name = m.name.toLowerCase();
  const nameParts = name.split('_');
  const lastPart = nameParts[nameParts.length - 1];

  // Suffix-based blocking: measurement IS a state/mode (suffix), not a reading FROM a status path (prefix)
  const blockedSuffixes = ['state', 'status', 'mode', 'phase', 'batch', 'recipe',
                           'start', 'active', 'msg', 'formula', 'eu'];
  if (blockedSuffixes.includes(lastPart)) return false;

  // Block 'eu_1' two-part suffix (Enterprise C control fields)
  if (nameParts.length >= 2) {
    const lastTwo = nameParts.slice(-2).join('_');
    if (lastTwo === 'eu_1') return false;
  }

  // OEE aggregates — always substring match
  if (name.includes('oee') || name.includes('availability') ||
      name.includes('performance') || name.includes('quality')) {
    return false;
  }

  // Counters — always substring match
  if (name.includes('count') || name.includes('total') || name.includes('produced') ||
      name.includes('reject') || name.includes('scrap') || name.includes('waste') ||
      name.includes('defect')) {
    return false;
  }

  // Time/date values — not suitable for SPC
  if (name.includes('time') || name.includes('date') || name.includes('timestamp') ||
      name.includes('duration') || name.includes('elapsed') || name.includes('timeout')) {
    return false;
  }

  // Must have sufficient data points to be useful for SPC
  if (m.count < 50) return false;

  return true;
}

/**
 * Cache for SPC discovery results (5-minute TTL, same as schema cache)
 */
const spcDiscoveryCache = {
  data: null,
  key: null,
  timestamp: 0,
  TTL: 5 * 60 * 1000  // 5 minutes
};

/**
 * Discover sites with SPC-eligible measurements for an enterprise
 * Reads from schema cache (no InfluxDB queries)
 * @param {string} enterprise - Enterprise filter
 * @returns {Promise<string[]>} Sorted array of site names
 */
async function discoverSPCSites(enterprise) {
  try {
    await refreshSchemaCache();
  } catch (err) {
    console.warn('[SPC] Schema refresh failed, using cached data:', err.message);
    if (schemaCache.measurements.size === 0) return [];
  }

  const allMeasurements = Array.from(schemaCache.measurements.values());
  const siteSet = new Set();

  for (const m of allMeasurements) {
    if (isSPCCandidate(m, enterprise)) {
      for (const site of m.sites) {
        siteSet.add(site);
      }
    }
  }

  return Array.from(siteSet).sort();
}

/**
 * Discover SPC-suitable measurements for an enterprise
 * Filters to numeric process variables (excludes states, counters)
 * @param {string} enterprise - Enterprise filter
 * @param {number} limit - Max measurements to return
 * @param {string} [site] - Optional site filter
 * @returns {Promise<Array>} Array of measurement metadata
 */
async function discoverSPCMeasurements(enterprise, limit = 5, site = null) {
  // Check cache first
  const cacheKey = `${enterprise}|${limit}|${site || ''}`;
  const now = Date.now();
  if (spcDiscoveryCache.key === cacheKey &&
      spcDiscoveryCache.data !== null &&
      (now - spcDiscoveryCache.timestamp) < spcDiscoveryCache.TTL) {
    console.log('[SPC] Returning cached discovery results');
    return spcDiscoveryCache.data;
  }

  try {
    await refreshSchemaCache();
  } catch (err) {
    console.warn('[SPC] Schema refresh failed, using cached data:', err.message);
    if (schemaCache.measurements.size === 0) return [];
  }

  const allMeasurements = Array.from(schemaCache.measurements.values());

  // Filter to numeric process variable measurements in this enterprise
  const candidates = allMeasurements.filter(m => {
    if (!isSPCCandidate(m, enterprise)) return false;
    if (site && !m.sites.includes(site)) return false;
    return true;
  });

  console.log(`[SPC] Found ${candidates.length} SPC candidates for ${enterprise}`);

  // Parallelize analysis of top 15 candidates
  const analysisResults = await Promise.allSettled(
    candidates.slice(0, 15).map(async (measurement) => {
      try {
        const data = await querySPCMeasurementData(measurement.name, 'daily', enterprise);
        if (data.length < 10) return null; // Need sufficient data

        const values = data.map(d => d.value);
        const stats = calculateStatistics(values);

        // Auto-calculate control limits (±10% of mean as spec limits)
        const target = stats.mean;
        const tolerance = Math.abs(stats.mean * 0.1);
        const lsl = target - tolerance;
        const usl = target + tolerance;

        const cpk = calculateCpk(values, lsl, usl);
        const outOfControlPoints = detectOutOfControl(data, stats.mean, stats.stdDev);
        const score = calculateProblematicScore(stats, cpk, outOfControlPoints.length);

        // Generate display name
        const displayName = generateSPCDisplayName(measurement.name, measurement.sites[0]);

        return {
          measurement: measurement.name,
          displayName,
          enterprise,
          site: measurement.sites[0] || 'Unknown',
          statistics: {
            mean: parseFloat(stats.mean.toFixed(2)),
            stdDev: parseFloat(stats.stdDev.toFixed(3)),
            cpk: parseFloat(cpk.toFixed(2)),
            target,
            lsl,
            usl,
            outOfControlCount: outOfControlPoints.length,
            lastOutOfControl: outOfControlPoints.length > 0
              ? outOfControlPoints[outOfControlPoints.length - 1].timestamp
              : null
          },
          problematicScore: parseFloat(score.toFixed(3)),
          reason: generateProblematicReason(stats, cpk, outOfControlPoints.length)
        };
      } catch (error) {
        console.error(`[SPC] Error analyzing ${measurement.name}:`, error.message);
        return null;
      }
    })
  );

  // Extract successful results, filter nulls
  const analyzed = analysisResults
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  // Sort by problematic score descending
  analyzed.sort((a, b) => b.problematicScore - a.problematicScore);

  const results = analyzed.slice(0, limit);

  // Cache the results
  spcDiscoveryCache.data = results;
  spcDiscoveryCache.key = cacheKey;
  spcDiscoveryCache.timestamp = now;

  return results;
}

/**
 * Generate a cleaner display name for SPC measurements
 * Strips common prefixes and humanizes the remainder
 */
function generateSPCDisplayName(measurementName, site) {
  let name = measurementName;
  const prefixes = ['edge_', 'process_', 'Status_', 'sub_', 'chrom_', 'tff_', 'sum_', 'processdata_', 'input_', 'output_'];
  for (const p of prefixes) {
    if (name.startsWith(p) || name.startsWith(p.toLowerCase())) {
      name = name.slice(p.length);
      break;
    }
  }
  name = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return site && site !== 'Unknown' ? `${site} — ${name}` : name;
}

/**
 * Generate human-readable reason for problematic score
 */
function generateProblematicReason(stats, cpk, outOfControlCount) {
  const reasons = [];

  if (cpk < 1.0) {
    reasons.push('Very low process capability (Cpk < 1.0)');
  } else if (cpk < 1.33) {
    reasons.push('Low process capability (Cpk < 1.33)');
  }

  if (outOfControlCount > 0) {
    reasons.push(`${outOfControlCount} out-of-control reading${outOfControlCount > 1 ? 's' : ''}`);
  }

  const cv = stats.mean !== 0 ? (stats.stdDev / Math.abs(stats.mean)) : 0;
  if (cv > 0.15) {
    reasons.push('High variance');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Stable process';
}

/**
 * Query SPC measurement data from InfluxDB
 * @param {string} measurement - Measurement name
 * @param {string} window - Time window
 * @param {string} enterprise - Enterprise filter
 * @param {string} [site] - Optional site filter
 * @returns {Promise<Array>} Time-series data
 */
async function querySPCMeasurementData(measurement, window, enterprise, site = null) {
  const windowConfig = TIME_WINDOWS[validateTimeWindow(window)];
  const enterpriseFilter = enterprise && enterprise !== 'ALL'
    ? `|> filter(fn: (r) => r.enterprise == "${sanitizeInfluxIdentifier(enterprise)}")`
    : '';
  const siteFilter = site
    ? `|> filter(fn: (r) => r.site == "${sanitizeInfluxIdentifier(site)}")`
    : '';

  const fluxQuery = `
    from(bucket: "${CONFIG.influxdb.bucket}")
      |> range(start: ${windowConfig.range})
      |> filter(fn: (r) => r._field == "value")
      |> filter(fn: (r) => r._measurement == "${sanitizeInfluxIdentifier(measurement)}")
      ${enterpriseFilter}
      ${siteFilter}
      |> filter(fn: (r) => exists r._value)
      |> aggregateWindow(every: ${windowConfig.aggregation}, fn: mean, createEmpty: false)
      |> sort(columns: ["_time"])
  `;

  const results = [];
  await new Promise((resolve) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        results.push({
          timestamp: o._time,
          value: o._value,
          site: o.site || '',
          machine: o.machine || ''
        });
      },
      error(error) {
        console.error('[SPC] Query error:', error);
        resolve();
      },
      complete() {
        resolve();
      }
    });
  });

  return results;
}

/**
 * Get complete SPC data for a specific measurement
 * Includes control limits, out-of-control points, and statistics
 * @param {string} measurement - Measurement name
 * @param {string} window - Time window
 * @param {string} enterprise - Enterprise filter
 * @param {string} [site] - Optional site filter
 * @returns {Promise<Object>} Complete SPC dataset
 */
async function querySPCData(measurement, window, enterprise, site = null) {
  const data = await querySPCMeasurementData(measurement, window, enterprise, site);

  if (data.length === 0) {
    return {
      measurement,
      data: [],
      series: [],
      controlLimits: { ucl: 0, lcl: 0, mean: 0, target: 0 },
      statistics: { cpk: 0, stdDev: 0, count: 0 },
      timestamp: new Date().toISOString()
    };
  }

  // Group data by source (site + machine) to separate distinct streams
  const sourceMap = new Map();
  for (const point of data) {
    const sourceKey = [point.site, point.machine].filter(Boolean).join(' — ') || 'default';
    if (!sourceMap.has(sourceKey)) sourceMap.set(sourceKey, []);
    sourceMap.get(sourceKey).push(point);
  }

  // Calculate overall statistics across ALL data points
  const allValues = data.map(d => d.value);
  const stats = calculateStatistics(allValues);

  // Auto-calculate spec limits (±10% of mean)
  const target = stats.mean;
  const tolerance = Math.abs(stats.mean * 0.1);
  const lsl = target - tolerance;
  const usl = target + tolerance;

  // Calculate Cpk
  const cpk = calculateCpk(allValues, lsl, usl);

  // Calculate control limits (3σ)
  const ucl = stats.mean + 3 * stats.stdDev;
  const lcl = stats.mean - 3 * stats.stdDev;

  // Build per-source series with out-of-control annotations
  const series = [];
  for (const [source, points] of sourceMap) {
    // Deduplicate by timestamp within this series (keep latest value)
    const dedupedMap = new Map();
    for (const point of points) {
      const timeKey = new Date(point.timestamp).toISOString();
      dedupedMap.set(timeKey, point); // Later values overwrite earlier ones
    }
    const dedupedPoints = Array.from(dedupedMap.values());

    const oocPoints = detectOutOfControl(dedupedPoints, stats.mean, stats.stdDev);
    const annotated = dedupedPoints.map((point, idx) => {
      const ooc = oocPoints.find(p => p.index === idx);
      return {
        timestamp: point.timestamp,
        value: point.value,
        outOfControl: !!ooc,
        violationType: ooc ? ooc.violationType : null
      };
    });
    series.push({ source, data: annotated });
  }

  // Flat annotated data for backward compatibility (first series if single source)
  const flatData = series.length === 1
    ? series[0].data
    : series.flatMap(s => s.data).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const totalOOC = series.reduce((sum, s) => sum + s.data.filter(d => d.outOfControl).length, 0);

  return {
    measurement,
    data: flatData,
    series,
    controlLimits: {
      ucl: parseFloat(ucl.toFixed(3)),
      lcl: parseFloat(lcl.toFixed(3)),
      mean: parseFloat(stats.mean.toFixed(3)),
      target: parseFloat(target.toFixed(3))
    },
    statistics: {
      cpk: parseFloat(cpk.toFixed(2)),
      stdDev: parseFloat(stats.stdDev.toFixed(3)),
      count: stats.count,
      outOfControlCount: totalOOC
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  calculateCpk,
  calculateStatistics,
  detectOutOfControl,
  calculateProblematicScore,
  isSPCCandidate,
  discoverSPCSites,
  discoverSPCMeasurements,
  querySPCData,
  querySPCMeasurementData
};
