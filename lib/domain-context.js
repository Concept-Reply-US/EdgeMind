/**
 * @module domain-context
 * @description Domain-specific knowledge and measurement classification for factory intelligence.
 * Provides enterprise context, equipment specifications, and automatic measurement categorization.
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// MEASUREMENT CLASSIFICATION
// =============================================================================

/**
 * Classification categories for measurements based on naming patterns and value characteristics.
 * Used to automatically categorize measurements for better organization and querying.
 *
 * @constant {Object.<string, string[]>}
 */
const MEASUREMENT_CLASSIFICATIONS = {
  oee_metric: ['oee', 'OEE_Performance', 'OEE_Availability', 'OEE_Quality', 'availability', 'performance', 'quality'],
  sensor_reading: ['speed', 'temperature', 'pressure', 'humidity', 'voltage', 'current', 'flow', 'level', 'weight'],
  state_status: ['state', 'status', 'running', 'stopped', 'fault', 'alarm', 'mode', 'ready'],
  counter: ['count', 'total', 'produced', 'rejected', 'scrap', 'waste', 'good'],
  timing: ['time', 'duration', 'cycle', 'downtime', 'uptime', 'runtime'],
  description: [] // Fallback for string values
};

// =============================================================================
// ENTERPRISE DOMAIN CONTEXT
// =============================================================================

/**
 * Loads enterprise domain context from JSON config files.
 * Reads all .json files from config/enterprises/ directory.
 *
 * @returns {Object.<string, Object>} Enterprise domain context keyed by enterprise name
 */
function loadEnterpriseConfigs() {
  // Use null-prototype object to prevent prototype pollution
  const configs = Object.create(null);
  const configDir = path.resolve(__dirname, '..', 'config', 'enterprises');

  try {
    if (!fs.existsSync(configDir)) {
      console.warn(`[Domain] Config directory not found: ${configDir}`);
      return configs;
    }

    const files = fs.readdirSync(configDir);
    // Sort for deterministic load order
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

    for (const filename of jsonFiles) {
      try {
        const filePath = path.join(configDir, filename);

        // Security: Verify it's a regular file (not symlink)
        const stat = fs.lstatSync(filePath);
        if (!stat.isFile()) {
          console.warn(`[Domain] Skipping ${filename}: not a regular file`);
          continue;
        }

        // Security: Check file size limit (100KB)
        if (stat.size > 100 * 1024) {
          console.warn(`[Domain] Skipping ${filename}: exceeds 100KB size limit`);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);

        // Validate name field exists
        if (!config.name) {
          console.warn(`[Domain] Skipping ${filename}: missing 'name' field`);
          continue;
        }

        // Security: Prevent prototype pollution via forbidden keys
        const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'];
        if (FORBIDDEN_KEYS.includes(config.name)) {
          console.warn(`[Domain] Skipping ${filename}: forbidden name '${config.name}'`);
          continue;
        }

        // Validate required fields and types
        const requiredFields = {
          industry: 'string',
          equipment: 'object',
          criticalMetrics: 'array',
          concerns: 'array',
          safeRanges: 'object'
        };

        let valid = true;
        for (const [field, expectedType] of Object.entries(requiredFields)) {
          const value = config[field];
          if (value === undefined) {
            console.warn(`[Domain] Config ${filename}: missing required field '${field}'`);
            valid = false;
          } else if (expectedType === 'array' && !Array.isArray(value)) {
            console.warn(`[Domain] Config ${filename}: '${field}' should be an array`);
            valid = false;
          } else if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
            console.warn(`[Domain] Config ${filename}: '${field}' should be an object`);
            valid = false;
          } else if (expectedType === 'string' && typeof value !== 'string') {
            console.warn(`[Domain] Config ${filename}: '${field}' should be a string`);
            valid = false;
          }
        }

        if (!valid) {
          console.warn(`[Domain] Skipping ${filename}: failed schema validation`);
          continue;
        }

        // Log before storing (config.name will be deleted)
        console.log(`[Domain] Loaded enterprise config: ${config.name} (${config.industry})`);

        configs[config.name] = config;
        // Preserve original object shape (no 'name' field on enterprise objects)
        delete configs[config.name].name;
      } catch (err) {
        console.warn(`[Domain] Failed to parse ${filename}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Domain] Error loading enterprise configs:', err.message);
  }

  return configs;
}

/**
 * Domain-specific context for each enterprise.
 * Provides industry knowledge, equipment specifications, and safety ranges for AI-powered insights.
 * Loaded from JSON config files in config/enterprises/ directory.
 *
 * @constant {Object.<string, Object>}
 */
const ENTERPRISE_DOMAIN_CONTEXT = loadEnterpriseConfigs();

// =============================================================================
// ANOMALY CATEGORIES
// =============================================================================

/**
 * Anomaly category enum for categorizing detected anomalies.
 * Used for filtering, grouping, and prioritization.
 *
 * @constant {Object.<string, string>}
 */
const ANOMALY_CATEGORIES = {
  oee_degradation: 'OEE Degradation',
  equipment_fault: 'Equipment Fault',
  quality_exceedance: 'Quality Exceedance',
  thermal_exceedance: 'Thermal Exceedance',
  throughput_drop: 'Throughput Drop',
  state_transition: 'State Transition',
  uncategorized: 'Uncategorized'
};

/**
 * Categorizes an anomaly based on metric name and description patterns.
 *
 * @param {Object} anomaly - Anomaly object with metric and description
 * @returns {string} Category key from ANOMALY_CATEGORIES
 *
 * @example
 * categorizeAnomaly({ metric: 'oee', description: 'OEE drop' }) // 'oee_degradation'
 * categorizeAnomaly({ metric: 'temperature', description: 'High temp' }) // 'thermal_exceedance'
 */
function categorizeAnomaly(anomaly) {
  const metric = (anomaly.metric || '').toLowerCase();
  const desc = (anomaly.description || '').toLowerCase();

  if (metric.includes('oee') || desc.includes('oee')) return 'oee_degradation';
  if (metric.includes('temp') || desc.includes('thermal') || desc.includes('temperature')) return 'thermal_exceedance';
  if (metric.includes('defect') || metric.includes('quality') || desc.includes('defect') || desc.includes('quality')) return 'quality_exceedance';
  if (desc.includes('transitioned') || desc.includes('state')) return 'state_transition';
  if (metric.includes('throughput') || metric.includes('count') || desc.includes('throughput')) return 'throughput_drop';
  if (desc.includes('equipment') || desc.includes('fault') || desc.includes('down')) return 'equipment_fault';
  return 'uncategorized';
}

// =============================================================================
// CLASSIFICATION FUNCTIONS
// =============================================================================

/**
 * Automatically classifies a measurement based on its name using pattern matching.
 * Returns the category key and a confidence indicator.
 *
 * @param {string} measurementName - The measurement name to classify
 * @returns {Object} Classification result with category and confidence
 * @returns {string} return.category - The classification category key
 * @returns {boolean} return.confident - Whether the classification is confident (exact match)
 *
 * @example
 * classifyMeasurement('machine_oee') // { category: 'oee_metric', confident: true }
 * classifyMeasurement('sensor_temp') // { category: 'sensor_reading', confident: true }
 * classifyMeasurement('unknown') // { category: 'description', confident: false }
 */
function classifyMeasurement(measurementName) {
  if (!measurementName || typeof measurementName !== 'string') {
    return { category: 'description', confident: false };
  }

  const lowerName = measurementName.toLowerCase();

  // Check each classification category for pattern matches
  for (const [category, patterns] of Object.entries(MEASUREMENT_CLASSIFICATIONS)) {
    // Skip description category (fallback)
    if (category === 'description') continue;

    // Check if measurement name contains any of the patterns
    for (const pattern of patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return { category, confident: true };
      }
    }
  }

  // Default to description category for unclassified measurements
  return { category: 'description', confident: false };
}

/**
 * Gets enterprise domain context by enterprise name.
 *
 * @param {string} enterpriseName - The enterprise name (e.g., 'Enterprise A')
 * @returns {Object|null} Enterprise domain context or null if not found
 *
 * @example
 * getEnterpriseContext('Enterprise A') // { industry: 'Glass Manufacturing', ... }
 */
function getEnterpriseContext(enterpriseName) {
  return ENTERPRISE_DOMAIN_CONTEXT[enterpriseName] || null;
}

/**
 * Gets all available enterprise names.
 *
 * @returns {string[]} Array of enterprise names
 *
 * @example
 * getEnterpriseNames() // ['Enterprise A', 'Enterprise B', 'Enterprise C']
 */
function getEnterpriseNames() {
  return Object.keys(ENTERPRISE_DOMAIN_CONTEXT);
}

/**
 * Checks if a measurement is a waste metric for a given enterprise.
 *
 * @param {string} measurementName - The measurement name
 * @param {string} enterpriseName - The enterprise name
 * @returns {boolean} True if the measurement is a waste metric
 *
 * @example
 * isWasteMetric('OEE_Waste', 'Enterprise A') // true
 * isWasteMetric('temperature', 'Enterprise A') // false
 */
function isWasteMetric(measurementName, enterpriseName) {
  const context = getEnterpriseContext(enterpriseName);
  if (!context || !context.wasteMetrics) {
    return false;
  }

  const lowerName = measurementName.toLowerCase();
  return context.wasteMetrics.some(metric => lowerName.includes(metric.toLowerCase()));
}

/**
 * Checks if an enterprise uses ISA-88 batch control (vs OEE).
 *
 * @param {string} enterpriseName - The enterprise name
 * @returns {boolean} True if enterprise uses batch control
 *
 * @example
 * usesBatchControl('Enterprise C') // true
 * usesBatchControl('Enterprise A') // false
 */
function usesBatchControl(enterpriseName) {
  const context = getEnterpriseContext(enterpriseName);
  return context?.analysisMode === 'batch' || context?.batchControl === 'ISA-88';
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  MEASUREMENT_CLASSIFICATIONS,
  ENTERPRISE_DOMAIN_CONTEXT,
  ANOMALY_CATEGORIES,
  classifyMeasurement,
  categorizeAnomaly,
  getEnterpriseContext,
  getEnterpriseNames,
  isWasteMetric,
  usesBatchControl
};
