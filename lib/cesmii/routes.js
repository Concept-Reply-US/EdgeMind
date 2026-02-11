// lib/cesmii/routes.js - CESMII REST API Routes
'use strict';

const express = require('express');
const router = express.Router();
const CONFIG = require('../config');
const { factoryState } = require('../state');
const { validateEnterprise, validateSite } = require('../validation');
const fs = require('fs');
const path = require('path');

/**
 * GET /api/cesmii/work-orders
 * Returns stored CESMII work orders from state.
 * Query params: ?limit=20&enterprise=Enterprise+B
 */
router.get('/work-orders', (req, res) => {
  try {
    let workOrders = [...factoryState.cesmiiWorkOrders];

    // Filter by enterprise if specified
    const enterprise = req.query.enterprise;
    if (enterprise) {
      const validated = validateEnterprise(enterprise);
      if (validated && validated !== 'ALL') {
        workOrders = workOrders.filter(wo => wo.enterprise === validated);
      }
    }

    // Limit results
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    // Return newest first
    workOrders.reverse();
    workOrders = workOrders.slice(0, limit);

    res.json({
      workOrders,
      total: factoryState.cesmiiWorkOrders.length,
      limit
    });
  } catch (error) {
    console.error('[CESMII] Route error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/cesmii/profiles
 * Returns list of bundled SM Profiles with metadata.
 */
router.get('/profiles', (req, res) => {
  try {
    const profilesDir = CONFIG.cesmii.profilesDir;

    // Read profiles from the already-loaded cache in validator
    // Fall back to filesystem if cache is empty
    const { getLoadedProfileTypes } = require('./validator');
    const loadedTypes = getLoadedProfileTypes();

    if (loadedTypes.length > 0) {
      const profiles = loadedTypes.map(({ typeName, profile }) => ({
        type: typeName,
        name: profile.profile?.name || typeName,
        version: profile.profile?.version || '1.0.0',
        description: profile.profile?.description || '',
        attributeCount: profile.profile?.attributes?.length || 0,
        profileDefinition: profile.profileDefinition || null
      }));
      return res.json({ profiles });
    }

    // Fallback: read from disk (shouldn't happen if init ran)
    const profiles = [];
    if (fs.existsSync(profilesDir)) {
      const files = fs.readdirSync(profilesDir);
      for (const file of files) {
        if (file.endsWith('.jsonld')) {
          const content = JSON.parse(fs.readFileSync(path.join(profilesDir, file), 'utf8'));
          profiles.push({
            type: content['@type'] || 'unknown',
            name: content.profile?.name || file,
            version: content.profile?.version || '1.0.0',
            description: content.profile?.description || '',
            attributeCount: content.profile?.attributes?.length || 0,
            profileDefinition: content.profileDefinition || null
          });
        }
      }
    }

    res.json({ profiles });
  } catch (error) {
    console.error('[CESMII] Route error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/cesmii/stats
 * Returns CESMII statistics counters.
 */
router.get('/stats', (req, res) => {
  res.json(factoryState.cesmiiStats);
});

// --- Publisher Endpoints ---

// Will be set during publisher init
let publisher = null;
let demoPublisher = null;
let mqttClientRef = null;

/**
 * Set publisher reference for routes
 */
function setPublisher(pub) {
  publisher = pub;
}

/**
 * Set demo publisher and MQTT client references
 */
function setDemoPublisher(demoPub, client) {
  demoPublisher = demoPub;
  mqttClientRef = client;
}

/**
 * POST /api/cesmii/publish/oee
 * Trigger OEE report publication on demand.
 * Body: { enterprise, site, oeeData }
 */
router.post('/publish/oee', (req, res) => {
  if (!publisher) {
    return res.status(503).json({ error: 'Publisher not initialized' });
  }

  const { enterprise, site, oeeData } = req.body || {};
  if (!enterprise || !oeeData) {
    return res.status(400).json({ error: 'enterprise and oeeData are required' });
  }

  const validatedEnterprise = validateEnterprise(enterprise);
  if (!validatedEnterprise) {
    return res.status(400).json({ error: 'Invalid enterprise' });
  }

  const validatedSite = site ? validateSite(site) : null;
  const success = publisher.publishOEEReport(oeeData, validatedEnterprise, validatedSite);
  res.json({ published: success, profileType: 'OEEReportV1' });
});

/**
 * POST /api/cesmii/publish/insight
 * Trigger insight publication on demand.
 * Body: { enterprise, insight }
 */
router.post('/publish/insight', (req, res) => {
  if (!publisher) {
    return res.status(503).json({ error: 'Publisher not initialized' });
  }

  const { enterprise, insight } = req.body || {};
  if (!insight) {
    return res.status(400).json({ error: 'insight is required' });
  }

  const validatedEnterprise = enterprise ? validateEnterprise(enterprise) : 'ALL';
  const success = publisher.publishFactoryInsight(insight, validatedEnterprise || 'ALL');
  res.json({ published: success, profileType: 'FactoryInsightV1' });
});

/**
 * POST /api/cesmii/demo/start
 * Start demo work order publishing.
 */
router.post('/demo/start', (req, res) => {
  if (!demoPublisher || !mqttClientRef) {
    return res.status(503).json({ error: 'Demo publisher not available' });
  }

  try {
    const result = demoPublisher.startDemoWorkOrders(mqttClientRef);
    res.json(result);
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
});

/**
 * POST /api/cesmii/demo/stop
 * Stop demo work order publishing.
 */
router.post('/demo/stop', (req, res) => {
  if (!demoPublisher) {
    return res.status(503).json({ error: 'Demo publisher not available' });
  }

  const result = demoPublisher.stopDemoWorkOrders();
  res.json(result);
});

/**
 * GET /api/cesmii/demo/status
 * Check demo publisher status.
 */
router.get('/demo/status', (req, res) => {
  if (!demoPublisher) {
    return res.json({ running: false, orderCount: 0 });
  }

  res.json(demoPublisher.getStatus());
});

module.exports = { router, setPublisher, setDemoPublisher };
