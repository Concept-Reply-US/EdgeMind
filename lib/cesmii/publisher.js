// lib/cesmii/publisher.js - CESMII SM Profile Publisher
// Publishes EdgeMind OEE reports and AI insights as JSON-LD payloads
'use strict';

const { randomUUID } = require('crypto');
const CONFIG = require('../config');
const { factoryState } = require('../state');

let mqttClient = null;

/**
 * Initialize the publisher with MQTT client.
 * @param {Object} params
 * @param {Object} params.mqttClient - Connected MQTT client
 */
function init({ mqttClient: client }) {
  mqttClient = client;
  console.log('[CESMII Publisher] Initialized');
}

/**
 * Wrap data as CESMII SM Profile JSON-LD payload.
 * @param {Object} data - The data fields to include
 * @param {string} profileType - Profile @type (e.g., 'OEEReportV1')
 * @param {string} profileUrl - URL to the profile definition
 * @returns {Object} JSON-LD formatted payload
 */
function wrapAsJsonLd(data, profileType, profileUrl) {
  return {
    ...data,
    '@context': {
      '@vocab': 'https://cesmii.org/smprofile/',
      'profile': 'https://cesmii.org/smprofile/profile',
      'opc': 'http://opcfoundation.org/UA/'
    },
    '@type': profileType,
    'profileDefinition': profileUrl
  };
}

/**
 * Publish an OEE report as OEEReportV1 SM Profile.
 * @param {Object} oeeData - OEE calculation result
 * @param {string} oeeData.oee - Overall OEE percentage
 * @param {string} oeeData.availability - Availability percentage
 * @param {string} oeeData.performance - Performance percentage
 * @param {string} oeeData.quality - Quality percentage
 * @param {string} oeeData.tier - Calculation tier
 * @param {number} oeeData.confidence - Confidence score
 * @param {string} enterprise - Enterprise name
 * @param {string} site - Site name
 */
function publishOEEReport(oeeData, enterprise, site) {
  if (!mqttClient || !mqttClient.connected) {
    console.warn('[CESMII Publisher] Cannot publish - MQTT not connected');
    return false;
  }

  const payload = wrapAsJsonLd({
    ReportId: randomUUID(),
    Enterprise: enterprise,
    Site: site || 'ALL',
    OEE: parseFloat(oeeData.oee) || 0,
    Availability: parseFloat(oeeData.availability) || 0,
    Performance: parseFloat(oeeData.performance) || 0,
    Quality: parseFloat(oeeData.quality) || 0,
    CalculationTier: oeeData.tier || 'unknown',
    Confidence: typeof oeeData.confidence === 'number' ? oeeData.confidence : 0.5,
    CalculatedAt: new Date().toISOString()
  }, 'OEEReportV1', 'https://github.com/Concept-Reply-US/EdgeMind/blob/main/lib/cesmii/profiles/OEEReportV1.jsonld');

  const topic = `${CONFIG.cesmii.publishTopicPrefix}/oee/${enterprise}/${site || 'ALL'}`;

  try {
    mqttClient.publish(topic, JSON.stringify(payload));
    factoryState.cesmiiStats.profilesPublished++;
    factoryState.cesmiiStats.lastPublishAt = new Date().toISOString();
    console.log(`[CESMII Publisher] OEEReportV1 → ${topic}`);
    return true;
  } catch (err) {
    console.error('[CESMII Publisher] OEE publish error:', err.message);
    return false;
  }
}

/**
 * Publish an AI insight as FactoryInsightV1 SM Profile.
 * @param {Object} insight - Claude AI insight
 * @param {string} insight.summary - Insight summary text
 * @param {string} insight.severity - Severity (info, warning, critical)
 * @param {string} insight.category - Category (trend, anomaly, recommendation)
 * @param {number} insight.confidence - Confidence score
 * @param {string} enterprise - Enterprise name
 */
function publishFactoryInsight(insight, enterprise) {
  if (!mqttClient || !mqttClient.connected) {
    console.warn('[CESMII Publisher] Cannot publish - MQTT not connected');
    return false;
  }

  const summary = insight.summary || insight.text || insight.analysis || 'EdgeMind AI insight';

  const payload = wrapAsJsonLd({
    InsightId: randomUUID(),
    Enterprise: enterprise || 'ALL',
    Summary: typeof summary === 'string' ? summary.substring(0, 2000) : String(summary).substring(0, 2000),
    Severity: insight.severity || 'info',
    Category: insight.category || insight.type || 'trend',
    GeneratedAt: new Date().toISOString(),
    Confidence: typeof insight.confidence === 'number' ? insight.confidence : 0.7
  }, 'FactoryInsightV1', 'https://github.com/Concept-Reply-US/EdgeMind/blob/main/lib/cesmii/profiles/FactoryInsightV1.jsonld');

  const topic = `${CONFIG.cesmii.publishTopicPrefix}/insights/${enterprise || 'ALL'}`;

  try {
    mqttClient.publish(topic, JSON.stringify(payload));
    factoryState.cesmiiStats.profilesPublished++;
    factoryState.cesmiiStats.lastPublishAt = new Date().toISOString();
    console.log(`[CESMII Publisher] FactoryInsightV1 → ${topic}`);
    return true;
  } catch (err) {
    console.error('[CESMII Publisher] Insight publish error:', err.message);
    return false;
  }
}

module.exports = { init, publishOEEReport, publishFactoryInsight, wrapAsJsonLd };
