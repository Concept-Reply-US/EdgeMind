// lib/cesmii/validator.js - CESMII SM Profile Validator
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Loaded profiles cache.
 * Maps profile type name (e.g., 'WorkOrderV1') to parsed profile definition.
 * @type {Map<string, Object>}
 */
const loadedProfiles = new Map();

/**
 * OPC UA type validation functions.
 * Each validator returns true if value is valid for the type.
 */
const OPC_UA_VALIDATORS = {
  /**
   * Validate Boolean type.
   * Accepts: true, false, 1, 0
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Boolean: (value) => {
    if (typeof value === 'boolean') return true;
    if (value === 1 || value === 0) return true;
    return false;
  },

  /**
   * Validate Int16 type.
   * Range: -32768 to 32767
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Int16: (value) => {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    return value >= -32768 && value <= 32767;
  },

  /**
   * Validate Int32 type.
   * Range: -2147483648 to 2147483647
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Int32: (value) => {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    return value >= -2147483648 && value <= 2147483647;
  },

  /**
   * Validate Int64 type.
   * Range: Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Int64: (value) => {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER;
  },

  /**
   * Validate UInt16 type.
   * Range: 0 to 65535
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  UInt16: (value) => {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    return value >= 0 && value <= 65535;
  },

  /**
   * Validate UInt32 type.
   * Range: 0 to 4294967295
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  UInt32: (value) => {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    return value >= 0 && value <= 4294967295;
  },

  /**
   * Validate UInt64 type.
   * Range: 0 to Number.MAX_SAFE_INTEGER
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  UInt64: (value) => {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    return value >= 0 && value <= Number.MAX_SAFE_INTEGER;
  },

  /**
   * Validate Float type.
   * Any finite number
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Float: (value) => {
    if (typeof value !== 'number') return false;
    return Number.isFinite(value);
  },

  /**
   * Validate Double type.
   * Any finite number
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Double: (value) => {
    if (typeof value !== 'number') return false;
    return Number.isFinite(value);
  },

  /**
   * Validate String type.
   * Any string value
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  String: (value) => {
    return typeof value === 'string';
  },

  /**
   * Validate DateTime type.
   * Accepts ISO 8601 strings or numeric timestamps
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  DateTime: (value) => {
    // Accept numeric timestamp
    if (typeof value === 'number' && Number.isFinite(value)) {
      return true;
    }

    // Accept ISO 8601 string
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }

    return false;
  },

  /**
   * Validate UtcTime type.
   * Same as DateTime
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  UtcTime: (value) => {
    return OPC_UA_VALIDATORS.DateTime(value);
  },

  /**
   * Validate Guid type.
   * UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   * @param {*} value - Value to validate
   * @returns {boolean}
   */
  Guid: (value) => {
    if (typeof value !== 'string') return false;
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(value);
  }
};

/**
 * Validate a value against an OPC UA type.
 *
 * @param {*} value - Value to validate
 * @param {string} opcUaType - OPC UA type string (e.g., 'opc:String', 'String', 'Int32')
 * @returns {boolean} True if value matches type
 */
function validateOpcUaType(value, opcUaType) {
  // Strip 'opc:' prefix if present
  const typeName = opcUaType.replace(/^opc:/, '');

  // Handle array types (e.g., 'FeedIngredientV1[]')
  if (typeName.endsWith('[]')) {
    // For arrays, we just check that value is an array
    // Nested profile validation happens in validatePayload
    return Array.isArray(value);
  }

  // Check if it's a known OPC UA type
  const validator = OPC_UA_VALIDATORS[typeName];
  if (validator) {
    return validator(value);
  }

  // Unknown type - assume it's a nested profile type
  // Nested profile validation happens in validatePayload
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Load a CESMII SM Profile from a JSON-LD file.
 *
 * @param {string} profilePath - Absolute path to profile JSON-LD file
 * @returns {Object|null} Parsed profile definition or null on error
 */
function loadProfile(profilePath) {
  try {
    const content = fs.readFileSync(profilePath, 'utf8');
    const profile = JSON.parse(content);

    // Validate profile structure
    if (!profile['@type']) {
      console.error(`Profile missing @type: ${profilePath}`);
      return null;
    }

    if (!profile.profile || !profile.profile.attributes || !Array.isArray(profile.profile.attributes)) {
      console.error(`Profile missing profile.attributes array: ${profilePath}`);
      return null;
    }

    // Cache the loaded profile
    const typeName = profile['@type'];
    loadedProfiles.set(typeName, profile);

    return profile;
  } catch (err) {
    console.error(`Failed to load profile ${profilePath}:`, err.message);
    return null;
  }
}

/**
 * Get a loaded profile by type name.
 *
 * @param {string} typeName - Profile type name (e.g., 'WorkOrderV1')
 * @returns {Object|null} Profile definition or null if not loaded
 */
function getProfileForType(typeName) {
  return loadedProfiles.get(typeName) || null;
}

/**
 * Validate a payload against a loaded profile.
 *
 * @param {Object} payload - Parsed CESMII payload to validate
 * @param {Object} profile - Loaded profile definition
 * @param {number} _depth - Internal recursion depth counter
 * @returns {Object} Validation result { valid: boolean, errors: string[], warnings: string[] }
 */
function validatePayload(payload, profile, _depth = 0) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Defensive check
  if (!payload || typeof payload !== 'object') {
    result.valid = false;
    result.errors.push('Payload is not an object');
    return result;
  }

  if (!profile || !profile.profile || !profile.profile.attributes) {
    result.valid = false;
    result.errors.push('Invalid profile definition');
    return result;
  }

  // Guard against recursive/circular profiles
  if (_depth > 10) {
    result.valid = false;
    result.errors.push('Maximum nesting depth exceeded');
    return result;
  }

  const attributes = profile.profile.attributes;

  // Validate each attribute
  for (const attr of attributes) {
    const { attributeName, dataType, description } = attr;

    // Check if attribute exists in payload
    if (!(attributeName in payload)) {
      result.valid = false;
      result.errors.push(`Missing required field: ${attributeName}`);
      continue;
    }

    const value = payload[attributeName];

    // Strip 'opc:' prefix for type checking
    const typeName = dataType.replace(/^opc:/, '');

    // Handle array of nested profiles (e.g., 'FeedIngredientV1[]')
    if (typeName.endsWith('[]')) {
      const nestedTypeName = typeName.slice(0, -2); // Remove '[]'

      if (!Array.isArray(value)) {
        result.valid = false;
        result.errors.push(`Field ${attributeName} must be an array`);
        continue;
      }

      // Validate each array element
      const nestedProfile = getProfileForType(nestedTypeName);
      if (!nestedProfile) {
        result.warnings.push(`Nested profile ${nestedTypeName} not loaded, skipping validation`);
        continue;
      }

      for (let i = 0; i < value.length; i++) {
        const nestedResult = validatePayload(value[i], nestedProfile, _depth + 1);
        if (!nestedResult.valid) {
          result.valid = false;
          nestedResult.errors.forEach(err => {
            result.errors.push(`${attributeName}[${i}]: ${err}`);
          });
        }
        nestedResult.warnings.forEach(warn => {
          result.warnings.push(`${attributeName}[${i}]: ${warn}`);
        });
      }

      continue;
    }

    // Handle nested profile (non-array)
    if (!OPC_UA_VALIDATORS[typeName]) {
      // Unknown type - assume it's a nested profile
      const nestedProfile = getProfileForType(typeName);
      if (!nestedProfile) {
        result.warnings.push(`Nested profile ${typeName} not loaded, skipping validation for ${attributeName}`);
        continue;
      }

      const nestedResult = validatePayload(value, nestedProfile, _depth + 1);
      if (!nestedResult.valid) {
        result.valid = false;
        nestedResult.errors.forEach(err => {
          result.errors.push(`${attributeName}: ${err}`);
        });
      }
      nestedResult.warnings.forEach(warn => {
        result.warnings.push(`${attributeName}: ${warn}`);
      });

      continue;
    }

    // Validate OPC UA type
    if (!validateOpcUaType(value, dataType)) {
      result.valid = false;
      result.errors.push(`Field ${attributeName} has invalid type. Expected ${dataType}, got ${typeof value}`);
    }
  }

  return result;
}

/**
 * Load all profiles from the profiles directory.
 *
 * @param {string} profilesDir - Directory containing profile JSON-LD files
 * @returns {number} Number of profiles successfully loaded
 */
function loadAllProfiles(profilesDir) {
  let loadedCount = 0;

  try {
    const files = fs.readdirSync(profilesDir);

    for (const file of files) {
      if (file.endsWith('.jsonld')) {
        const profilePath = path.join(profilesDir, file);
        const profile = loadProfile(profilePath);
        if (profile) {
          loadedCount++;
        }
      }
    }
  } catch (err) {
    console.error(`Failed to read profiles directory ${profilesDir}:`, err.message);
  }

  return loadedCount;
}

/**
 * Get all loaded profile types and their definitions.
 * @returns {Array<{typeName: string, profile: Object}>}
 */
function getLoadedProfileTypes() {
  return Array.from(loadedProfiles.entries()).map(([typeName, profile]) => ({
    typeName,
    profile
  }));
}

/**
 * Clear the loaded profiles cache.
 * Useful for testing or reloading profiles.
 */
function clearProfileCache() {
  loadedProfiles.clear();
}

module.exports = {
  loadProfile,
  loadAllProfiles,
  getProfileForType,
  getLoadedProfileTypes,
  validatePayload,
  validateOpcUaType,
  clearProfileCache
};
