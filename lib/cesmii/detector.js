// lib/cesmii/detector.js - CESMII SM Profile Payload Detector
'use strict';

/**
 * Check if a payload is a CESMII SM Profile JSON-LD message.
 * Checks for @type AND (@context OR profileDefinition).
 *
 * @param {Buffer|string|object} payload - Raw MQTT payload
 * @returns {boolean} True if payload appears to be a CESMII SM Profile
 */
function isCesmiiPayload(payload) {
  try {
    let parsed = payload;

    // Handle Buffer input
    if (Buffer.isBuffer(payload)) {
      const str = payload.toString('utf8');
      parsed = JSON.parse(str);
    }

    // Handle string input
    if (typeof payload === 'string') {
      parsed = JSON.parse(payload);
    }

    // Must be an object at this point
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return false;
    }

    // Must have @type field
    if (!parsed['@type'] || typeof parsed['@type'] !== 'string') {
      return false;
    }

    // Must have either @context OR profileDefinition
    const hasContext = parsed['@context'] !== undefined && parsed['@context'] !== null;
    const hasProfileDef = typeof parsed.profileDefinition === 'string';

    return hasContext || hasProfileDef;
  } catch (err) {
    // JSON parse error or other exception means not a CESMII payload
    return false;
  }
}

/**
 * Extract the SM Profile type name from a CESMII payload.
 * Handles both simple type names and URL-based type identifiers.
 *
 * @param {Buffer|string|object} payload - CESMII SM Profile payload
 * @returns {string|null} Profile type (e.g., 'WorkOrderV1') or null if not detected
 */
function extractProfileType(payload) {
  try {
    let parsed = payload;

    // Handle Buffer input
    if (Buffer.isBuffer(payload)) {
      const str = payload.toString('utf8');
      parsed = JSON.parse(str);
    }

    // Handle string input
    if (typeof payload === 'string') {
      parsed = JSON.parse(payload);
    }

    // Must be an object with @type
    if (typeof parsed !== 'object' || parsed === null || !parsed['@type']) {
      return null;
    }

    const typeValue = parsed['@type'];

    // If @type is a URL, extract the last segment
    if (typeValue.includes('/')) {
      const segments = typeValue.split('/');
      return segments[segments.length - 1];
    }

    // If @type contains a colon (namespace:Type), extract the type
    if (typeValue.includes(':')) {
      const parts = typeValue.split(':');
      return parts[parts.length - 1];
    }

    // Otherwise return the type as-is
    return typeValue;
  } catch (err) {
    return null;
  }
}

module.exports = { isCesmiiPayload, extractProfileType };
