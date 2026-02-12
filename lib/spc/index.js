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

  // Calculate standard deviation
  const squaredDiffs = measurements.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / measurements.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Calculate Cpk
  const cpkUpper = (usl - mean) / (3 * stdDev);
  const cpkLower = (mean - lsl) / (3 * stdDev);

  return Math.min(cpkUpper, cpkLower);
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
  const mean = measurements.reduce((sum, val) => sum + val, 0) / count;
  const squaredDiffs = measurements.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / count;
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

  // Exclude states, counters, OEE, timing, waste, and batch identifiers
  if (name.includes('state') || name.includes('status') || name.includes('mode') ||
      name.includes('phase') || name.includes('batch') || name.includes('recipe')) {
    return false;
  }
  if (name.includes('oee') || name.includes('availability') ||
      name.includes('performance') || name.includes('quality')) {
    return false;
  }
  if (name.includes('count') || name.includes('total') || name.includes('produced') ||
      name.includes('reject') || name.includes('scrap') || name.includes('waste') ||
      name.includes('defect')) {
    return false;
  }

  // Must have sufficient data points to be useful for SPC
  if (m.count < 50) return false;

  return true;
}

/**
 * Discover sites with SPC-eligible measurements for an enterprise
 * Reads from schema cache (no InfluxDB queries)
 * @param {string} enterprise - Enterprise filter
 * @returns {Promise<string[]>} Sorted array of site names
 */
async function discoverSPCSites(enterprise) {
  await refreshSchemaCache();

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
  await refreshSchemaCache();

  const allMeasurements = Array.from(schemaCache.measurements.values());

  // Filter to numeric process variable measurements in this enterprise
  const candidates = allMeasurements.filter(m => {
    if (!isSPCCandidate(m, enterprise)) return false;
    if (site && !m.sites.includes(site)) return false;
    return true;
  });

  console.log(`[SPC] Found ${candidates.length} SPC candidates for ${enterprise}`);

  // For each candidate, calculate statistics and problematic score
  const analyzed = [];

  for (const measurement of candidates.slice(0, 20)) { // Analyze top 20
    try {
      const data = await querySPCMeasurementData(measurement.name, 'daily', enterprise);
      if (data.length < 10) continue; // Need sufficient data

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
      const displayName = measurement.name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim();

      analyzed.push({
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
      });
    } catch (error) {
      console.error(`[SPC] Error analyzing ${measurement.name}:`, error.message);
    }
  }

  // Sort by problematic score descending
  analyzed.sort((a, b) => b.problematicScore - a.problematicScore);

  return analyzed.slice(0, limit);
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
      |> filter(fn: (r) => r._value != 0)
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
          value: o._value
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
      controlLimits: { ucl: 0, lcl: 0, mean: 0, target: 0 },
      statistics: { cpk: 0, stdDev: 0, count: 0 },
      timestamp: new Date().toISOString()
    };
  }

  // Calculate statistics
  const values = data.map(d => d.value);
  const stats = calculateStatistics(values);

  // Auto-calculate spec limits (±10% of mean)
  const target = stats.mean;
  const tolerance = Math.abs(stats.mean * 0.1);
  const lsl = target - tolerance;
  const usl = target + tolerance;

  // Calculate Cpk
  const cpk = calculateCpk(values, lsl, usl);

  // Calculate control limits (3σ)
  const ucl = stats.mean + 3 * stats.stdDev;
  const lcl = stats.mean - 3 * stats.stdDev;

  // Detect out-of-control points
  const outOfControlPoints = detectOutOfControl(data, stats.mean, stats.stdDev);

  // Annotate data with out-of-control flags
  const annotatedData = data.map((point, idx) => {
    const oocPoint = outOfControlPoints.find(p => p.index === idx);
    return {
      timestamp: point.timestamp,
      value: point.value,
      outOfControl: !!oocPoint,
      violationType: oocPoint ? oocPoint.violationType : null
    };
  });

  return {
    measurement,
    data: annotatedData,
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
      outOfControlCount: outOfControlPoints.length
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
