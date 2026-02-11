// lib/cesmii/demo-publisher.js - Demo CESMII Work Order Publisher
// Publishes sample WorkOrderV1 payloads for demonstration purposes
'use strict';

const { randomUUID } = require('crypto');
const CONFIG = require('../config');

let mqttClient = null;
let publishInterval = null;
let orderCounter = 0;

// Sample data for realistic demo work orders
const PRODUCTS = [
  { name: 'Premium Widget A', uom: 'units', qtyRange: [500, 2000] },
  { name: 'Industrial Gear B', uom: 'pieces', qtyRange: [100, 500] },
  { name: 'Sensor Module C', uom: 'units', qtyRange: [200, 1000] },
  { name: 'Hydraulic Valve D', uom: 'pieces', qtyRange: [50, 200] },
  { name: 'Circuit Board E', uom: 'units', qtyRange: [1000, 5000] }
];

const INGREDIENTS = [
  { name: 'Aluminum Alloy 6061', uom: 'kg', qtyRange: [10, 100] },
  { name: 'Stainless Steel 304', uom: 'kg', qtyRange: [5, 50] },
  { name: 'Copper Wire', uom: 'meters', qtyRange: [50, 500] },
  { name: 'Polycarbonate Resin', uom: 'kg', qtyRange: [2, 20] },
  { name: 'Silicone Sealant', uom: 'liters', qtyRange: [1, 10] },
  { name: 'Epoxy Adhesive', uom: 'liters', qtyRange: [0.5, 5] },
  { name: 'Ceramic Substrate', uom: 'units', qtyRange: [100, 1000] },
  { name: 'Rubber Gasket', uom: 'units', qtyRange: [50, 200] }
];

const STATUSES = ['New', 'InProgress', 'InProgress', 'InProgress']; // Weighted toward InProgress

/**
 * Generate a random number within a range
 */
function randomInRange(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * Pick a random element from an array
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a sample WorkOrderV1 payload
 */
function generateWorkOrder() {
  orderCounter++;
  const product = randomPick(PRODUCTS);
  const numIngredients = 2 + Math.floor(Math.random() * 4); // 2-5 ingredients

  const ingredients = [];
  const usedNames = new Set();
  let totalPercent = 0;

  for (let i = 0; i < numIngredients; i++) {
    let ing;
    do {
      ing = randomPick(INGREDIENTS);
    } while (usedNames.has(ing.name));
    usedNames.add(ing.name);

    const pct = i === numIngredients - 1
      ? Math.round((100 - totalPercent) * 100) / 100
      : Math.round((Math.random() * (60 / numIngredients)) * 100) / 100;
    totalPercent += pct;

    ingredients.push({
      IngredientName: ing.name,
      Quantity: randomInRange(ing.qtyRange[0], ing.qtyRange[1]),
      UnitOfMeasure: ing.uom,
      LotNumber: `LOT-${Date.now().toString(36).toUpperCase()}-${i}`,
      PercentOfTotal: pct
    });
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + (4 + Math.random() * 8) * 3600000); // 4-12 hours from now

  return {
    '@context': {
      '@vocab': 'https://cesmii.org/smprofile/',
      'profile': 'https://cesmii.org/smprofile/profile',
      'opc': 'http://opcfoundation.org/UA/'
    },
    '@type': 'WorkOrderV1',
    'profileDefinition': 'https://github.com/Concept-Reply-US/EdgeMind/blob/main/lib/cesmii/profiles/WorkOrderV1.jsonld',
    WorkOrderId: `WO-${now.getFullYear()}-${String(orderCounter).padStart(4, '0')}`,
    ProductName: product.name,
    Quantity: randomInRange(product.qtyRange[0], product.qtyRange[1]),
    UnitOfMeasure: product.uom,
    Status: randomPick(STATUSES),
    Priority: 1 + Math.floor(Math.random() * 5),
    StartTime: now.toISOString(),
    EndTime: endTime.toISOString(),
    Ingredients: ingredients
  };
}

/**
 * Start publishing demo work orders at regular intervals.
 * @param {Object} client - Connected MQTT client
 * @param {number} intervalMs - Publishing interval in ms (default: 10000)
 */
function startDemoWorkOrders(client, intervalMs = 10000) {
  if (publishInterval) {
    throw new Error('Demo work order publisher already running');
  }

  mqttClient = client;

  // Publish immediately, then at interval
  publishOne();
  publishInterval = setInterval(publishOne, intervalMs);

  console.log(`[CESMII Demo] Started publishing work orders every ${intervalMs / 1000}s`);
  return { status: 'started', intervalMs };
}

/**
 * Publish one demo work order
 */
function publishOne() {
  if (!mqttClient || !mqttClient.connected) {
    console.warn('[CESMII Demo] MQTT not connected');
    return;
  }

  const workOrder = generateWorkOrder();
  const topic = `Enterprise B/${CONFIG.demo.namespace}/cesmii/WorkOrder`;

  try {
    mqttClient.publish(topic, JSON.stringify(workOrder));
    console.log(`[CESMII Demo] Published ${workOrder.WorkOrderId} → ${topic}`);
  } catch (err) {
    console.error('[CESMII Demo] Publish error:', err.message);
  }
}

/**
 * Stop publishing demo work orders.
 */
function stopDemoWorkOrders() {
  if (publishInterval) {
    clearInterval(publishInterval);
    publishInterval = null;
    console.log('[CESMII Demo] Stopped publishing work orders');
    return { status: 'stopped' };
  }
  return { status: 'not_running' };
}

/**
 * Get demo publisher status
 */
function getStatus() {
  return {
    running: publishInterval !== null,
    orderCount: orderCounter
  };
}

module.exports = { startDemoWorkOrders, stopDemoWorkOrders, getStatus };
