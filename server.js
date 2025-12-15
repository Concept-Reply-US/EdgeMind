// server.js - Factory Intelligence Backend with InfluxDB + Agentic Claude
const mqtt = require('mqtt');
const Anthropic = require('@anthropic-ai/sdk');
const WebSocket = require('ws');
const express = require('express');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// Configuration
const CONFIG = {
  mqtt: {
    host: 'mqtt://virtualfactory.proveit.services:1883',
    username: 'proveitreadonly',
    password: 'proveitreadonlypassword',
    topics: ['#']
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514'
  },
  influxdb: {
    url: 'http://localhost:8086',
    token: 'proveit-factory-token-2026',
    org: 'proveit',
    bucket: 'factory'
  }
};

// Initialize services
const app = express();
const wss = new WebSocket.Server({ port: 8080 });
const anthropic = new Anthropic({ apiKey: CONFIG.anthropic.apiKey });

// InfluxDB setup
const influxDB = new InfluxDB({ url: CONFIG.influxdb.url, token: CONFIG.influxdb.token });
const writeApi = influxDB.getWriteApi(CONFIG.influxdb.org, CONFIG.influxdb.bucket, 'ns');
const queryApi = influxDB.getQueryApi(CONFIG.influxdb.org);

// State management
const factoryState = {
  messages: [],
  anomalies: [],
  insights: [],
  trendInsights: [],
  stats: {
    messageCount: 0,
    anomalyCount: 0,
    lastUpdate: null,
    influxWrites: 0
  }
};

// Agentic loop state
let lastTrendAnalysis = Date.now();
const TREND_ANALYSIS_INTERVAL = 30000; // Analyze trends every 30 seconds

// Connect to MQTT broker
console.log('🏭 Connecting to ProveIt! Virtual Factory...');
const mqttClient = mqtt.connect(CONFIG.mqtt.host, {
  username: CONFIG.mqtt.username,
  password: CONFIG.mqtt.password,
  reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker!');
  CONFIG.mqtt.topics.forEach(topic => {
    mqttClient.subscribe(topic, (err) => {
      if (!err) console.log(`📡 Subscribed to: ${topic}`);
    });
  });

  // Start the agentic trend analysis loop
  startAgenticLoop();
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
});

// Parse MQTT topic into measurement and tags
function parseTopicToInflux(topic, payload) {
  // Topic format: Enterprise X/SiteY/area/machine/component/metric/type
  const parts = topic.split('/');

  // Try to parse payload as number
  let value = parseFloat(payload);
  const isNumeric = !isNaN(value);

  // Create measurement name from last 2-3 parts of topic
  const measurement = parts.slice(-2).join('_').replace(/[^a-zA-Z0-9_]/g, '_');

  const point = new Point(measurement)
    .tag('enterprise', parts[0] || 'unknown')
    .tag('site', parts[1] || 'unknown')
    .tag('area', parts[2] || 'unknown')
    .tag('machine', parts[3] || 'unknown')
    .tag('full_topic', topic);

  if (isNumeric) {
    point.floatField('value', value);
  } else {
    point.stringField('value', payload.substring(0, 200)); // Limit string length
  }

  return point;
}

// Handle incoming MQTT messages
mqttClient.on('message', async (topic, message) => {
  const timestamp = new Date().toISOString();
  const payload = message.toString();

  factoryState.stats.messageCount++;
  factoryState.stats.lastUpdate = timestamp;

  const mqttMessage = {
    timestamp,
    topic,
    payload,
    id: `msg_${Date.now()}_${Math.random()}`
  };

  // Write to InfluxDB
  try {
    const point = parseTopicToInflux(topic, payload);
    writeApi.writePoint(point);
    factoryState.stats.influxWrites++;
  } catch (err) {
    // Silently ignore write errors to not slow down the stream
  }

  // Keep small buffer in memory for immediate display
  factoryState.messages.push(mqttMessage);
  if (factoryState.messages.length > 100) {
    factoryState.messages.shift();
  }

  // Broadcast to WebSocket clients (throttled - every 10th message)
  if (factoryState.stats.messageCount % 10 === 0) {
    broadcastToClients({
      type: 'mqtt_message',
      data: mqttMessage
    });
  }
});

// Flush InfluxDB writes periodically
setInterval(() => {
  writeApi.flush().catch(err => console.error('InfluxDB flush error:', err));
}, 5000);

// =============================================================================
// AGENTIC TREND ANALYSIS LOOP
// =============================================================================
async function startAgenticLoop() {
  console.log('🤖 Starting Agentic Trend Analysis Loop...');

  // Run the loop every TREND_ANALYSIS_INTERVAL
  setInterval(async () => {
    await runTrendAnalysis();
  }, TREND_ANALYSIS_INTERVAL);

  // Run first analysis after 15 seconds to let data accumulate
  setTimeout(async () => {
    await runTrendAnalysis();
  }, 15000);
}

async function runTrendAnalysis() {
  console.log('📊 Running trend analysis...');

  try {
    // Query aggregated data from InfluxDB
    const trends = await queryTrends();

    if (!trends || trends.length === 0) {
      console.log('📊 No trend data available yet');
      return;
    }

    // Send to Claude for analysis
    const insight = await analyzeTreesWithClaude(trends);

    if (insight) {
      factoryState.trendInsights.push(insight);
      if (factoryState.trendInsights.length > 20) {
        factoryState.trendInsights.shift();
      }

      // Broadcast to clients
      broadcastToClients({
        type: 'trend_insight',
        data: insight
      });

      console.log('✨ Trend Analysis:', insight.summary);
    }

  } catch (error) {
    console.error('❌ Trend analysis error:', error.message);
  }
}

async function queryTrends() {
  const fluxQuery = `
    from(bucket: "${CONFIG.influxdb.bucket}")
      |> range(start: -5m)
      |> filter(fn: (r) => r._field == "value" and r._value > 0)
      |> group(columns: ["_measurement", "enterprise", "site", "area"])
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
      |> yield(name: "mean")
  `;

  const results = [];

  return new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        results.push({
          measurement: o._measurement,
          enterprise: o.enterprise,
          site: o.site,
          area: o.area,
          time: o._time,
          value: o._value
        });
      },
      error(error) {
        console.error('InfluxDB query error:', error);
        resolve([]); // Return empty on error
      },
      complete() {
        resolve(results);
      }
    });
  });
}

async function analyzeTreesWithClaude(trends) {
  // Summarize trends for Claude
  const trendSummary = summarizeTrends(trends);

  const prompt = `You are an AI factory monitoring agent analyzing time-series trend data from a manufacturing facility.

## Current Trend Data (Last 5 Minutes, 1-Minute Aggregates)

${trendSummary}

## Your Task

Analyze these trends and provide:
1. **Summary**: A 1-2 sentence overview of factory performance
2. **Trends**: Key metrics that are rising, falling, or stable
3. **Anomalies**: Any concerning patterns (sudden changes, values outside normal range)
4. **Recommendations**: Actionable suggestions for operators

Respond in JSON format:
{
  "summary": "brief overview",
  "trends": [{"metric": "name", "direction": "rising|falling|stable", "change_percent": 0}],
  "anomalies": ["list of concerns"],
  "recommendations": ["list of actions"],
  "severity": "low|medium|high",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await anthropic.messages.create({
      model: CONFIG.anthropic.model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    let responseText = response.content[0].text;
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const analysis = JSON.parse(responseText);

    return {
      id: `trend_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...analysis,
      dataPoints: trends.length
    };

  } catch (error) {
    console.error('Claude trend analysis error:', error.message);
    return null;
  }
}

function summarizeTrends(trends) {
  // Group by measurement
  const grouped = {};
  trends.forEach(t => {
    const key = `${t.enterprise}/${t.site}/${t.area}/${t.measurement}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({ time: t.time, value: t.value });
  });

  // Create summary
  const lines = [];
  Object.entries(grouped).slice(0, 30).forEach(([key, values]) => {
    if (values.length >= 2) {
      const first = values[0].value;
      const last = values[values.length - 1].value;
      const change = ((last - first) / first * 100).toFixed(1);
      const avg = (values.reduce((s, v) => s + v.value, 0) / values.length).toFixed(2);
      lines.push(`${key}: avg=${avg}, change=${change}% (${values.length} points)`);
    }
  });

  return lines.join('\n') || 'No aggregated data available';
}

// =============================================================================
// WEBSOCKET & API
// =============================================================================
wss.on('connection', (ws) => {
  console.log('👋 Frontend connected');

  ws.send(JSON.stringify({
    type: 'initial_state',
    data: {
      recentMessages: factoryState.messages.slice(-20),
      recentInsights: factoryState.trendInsights.slice(-5),
      recentAnomalies: factoryState.anomalies.slice(-10),
      stats: factoryState.stats
    }
  }));

  ws.on('message', (message) => {
    try {
      const request = JSON.parse(message);
      handleClientRequest(ws, request);
    } catch (error) {
      console.error('Invalid client message:', error);
    }
  });

  ws.on('close', () => {
    console.log('👋 Frontend disconnected');
  });
});

function handleClientRequest(ws, request) {
  switch (request.type) {
    case 'get_stats':
      ws.send(JSON.stringify({
        type: 'stats_response',
        data: factoryState.stats
      }));
      break;

    case 'ask_claude':
      askClaudeWithContext(request.question).then(answer => {
        ws.send(JSON.stringify({
          type: 'claude_response',
          data: { question: request.question, answer }
        }));
      });
      break;
  }
}

async function askClaudeWithContext(question) {
  const recentTrends = factoryState.trendInsights.slice(-3).map(t => t.summary).join('; ');
  const context = `Factory stats: ${JSON.stringify(factoryState.stats)}
Recent trend insights: ${recentTrends}`;

  try {
    const response = await anthropic.messages.create({
      model: CONFIG.anthropic.model,
      max_tokens: 500,
      messages: [
        { role: 'user', content: `${context}\n\nUser question: ${question}` }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error asking Claude:', error);
    return 'Sorry, I encountered an error processing your question.';
  }
}

function broadcastToClients(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Health endpoint with InfluxDB status
app.get('/health', async (req, res) => {
  let influxOk = false;
  try {
    await influxDB.ping();
    influxOk = true;
  } catch (e) {}

  res.json({
    status: 'online',
    mqtt: mqttClient.connected,
    influxdb: influxOk,
    stats: factoryState.stats
  });
});

// API endpoint to query trends directly
app.get('/api/trends', async (req, res) => {
  const trends = await queryTrends();
  res.json(trends);
});

// Start HTTP server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 WebSocket server on port 8080`);
  console.log(`🏭 MQTT: ${mqttClient.connected ? 'Connected' : 'Connecting...'}`);
  console.log(`📈 InfluxDB: ${CONFIG.influxdb.url}`);
  console.log(`🤖 Claude AI: ${CONFIG.anthropic.apiKey ? 'Configured' : 'Missing API key!'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await writeApi.close();
  mqttClient.end();
  wss.close();
  process.exit(0);
});
