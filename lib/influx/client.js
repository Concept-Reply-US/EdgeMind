// lib/influx/client.js - InfluxDB Client Setup Module
// Centralizes InfluxDB client initialization and provides access to writeApi and queryApi.

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const CONFIG = require('../config');

/**
 * InfluxDB client instance configured with URL and authentication token.
 * Used for all interactions with the InfluxDB time-series database.
 *
 * @type {InfluxDB}
 */
const influxDB = new InfluxDB({
  url: CONFIG.influxdb.url,
  token: CONFIG.influxdb.token
});

/**
 * Write API instance for writing data points to InfluxDB.
 * Configured with organization, bucket, and nanosecond precision.
 *
 * @type {WriteApi}
 * @see https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/write/
 */
const writeApi = influxDB.getWriteApi(
  CONFIG.influxdb.org,
  CONFIG.influxdb.bucket,
  'ns'
);

/**
 * Query API instance for querying data from InfluxDB using Flux.
 * Configured with organization name.
 *
 * @type {QueryApi}
 * @see https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/query/
 */
const queryApi = influxDB.getQueryApi(CONFIG.influxdb.org);

/**
 * Re-exported Point class for creating InfluxDB data points.
 * Provides a fluent API for building measurements with tags and fields.
 *
 * @example
 * const { Point } = require('./lib/influx/client');
 * const point = new Point('temperature')
 *   .tag('location', 'warehouse')
 *   .floatField('value', 72.5);
 *
 * @type {typeof Point}
 * @see https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/write/#point
 */

// Re-export writer utilities for convenience
const { parseTopicToInflux, writeSparkplugMetric } = require('./writer');

/**
 * Gets information about the configured InfluxDB bucket.
 *
 * @returns {Promise<Object>} Bucket information including ID, retention rules, and metadata
 * @throws {Error} If bucket not found or API request fails
 */
async function getBucketInfo() {
  const http = require('http');
  const url = new URL(CONFIG.influxdb.url);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 8086,
      path: `/api/v2/buckets?name=${encodeURIComponent(CONFIG.influxdb.bucket)}`,
      method: 'GET',
      headers: {
        'Authorization': `Token ${CONFIG.influxdb.token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`InfluxDB API error: ${res.statusCode} - ${data}`));
        }
        try {
          const response = JSON.parse(data);
          if (!response.buckets || response.buckets.length === 0) {
            return reject(new Error(`Bucket '${CONFIG.influxdb.bucket}' not found`));
          }
          resolve(response.buckets[0]);
        } catch (err) {
          reject(new Error(`Failed to parse bucket info: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Sets the retention policy for the configured InfluxDB bucket.
 *
 * @param {number} hours - Number of hours to retain data (0 = infinite)
 * @returns {Promise<Object>} Updated bucket information
 * @throws {Error} If bucket update fails
 */
async function setRetentionPolicy(hours) {
  const http = require('http');
  const url = new URL(CONFIG.influxdb.url);

  // First get the bucket ID
  const bucketInfo = await getBucketInfo();
  const bucketId = bucketInfo.id;

  const retentionRules = hours > 0
    ? [{ type: 'expire', everySeconds: hours * 3600 }]
    : [];

  const body = JSON.stringify({ retentionRules });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 8086,
      path: `/api/v2/buckets/${bucketId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${CONFIG.influxdb.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`InfluxDB API error: ${res.statusCode} - ${data}`));
        }
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Deletes all data from the configured InfluxDB bucket.
 * WARNING: This operation cannot be undone.
 *
 * @returns {Promise<void>}
 * @throws {Error} If delete operation fails
 */
async function clearBucket() {
  const http = require('http');
  const url = new URL(CONFIG.influxdb.url);

  const now = new Date().toISOString();
  const body = JSON.stringify({
    start: '1970-01-01T00:00:00Z',
    stop: now
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 8086,
      path: `/api/v2/delete?org=${encodeURIComponent(CONFIG.influxdb.org)}&bucket=${encodeURIComponent(CONFIG.influxdb.bucket)}`,
      method: 'POST',
      headers: {
        'Authorization': `Token ${CONFIG.influxdb.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 204 && res.statusCode !== 200) {
          return reject(new Error(`InfluxDB delete error: ${res.statusCode} - ${data}`));
        }
        resolve();
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  influxDB,
  writeApi,
  queryApi,
  Point,
  parseTopicToInflux,
  writeSparkplugMetric,
  getBucketInfo,
  setRetentionPolicy,
  clearBucket
};
