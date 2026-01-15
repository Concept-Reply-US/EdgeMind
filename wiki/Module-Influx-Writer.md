# Module: Influx Writer

**Source:** `lib/influx/writer.js`

## Purpose

Transforms MQTT messages into InfluxDB data points. Handles two distinct protocols:
1. **Standard MQTT topics** - Hierarchical topic paths from Enterprise A and generic sources
2. **Sparkplug B protocol** - Protobuf-encoded messages from Enterprise B

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `parseTopicToInflux` | Function | Converts standard MQTT topic + payload to InfluxDB Point |
| `writeSparkplugMetric` | Function | Converts Sparkplug B metric to InfluxDB Point |

## Function: parseTopicToInflux

Parses a hierarchical MQTT topic and converts it to an InfluxDB Point.

### Signature

```javascript
function parseTopicToInflux(topic: string, payload: string): Point
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | string | MQTT topic path (e.g., `Enterprise A/Site1/area/machine/component/metric`) |
| `payload` | string | MQTT message payload (numeric or string) |

### Topic Structure

```
Enterprise X / Site Y / Area / Machine / Component / Metric / Type
     |           |        |        |          |         |       |
   Tag        Tag      Tag      Tag       Tag       [measurement name]
```

The last 2 parts of the topic become the measurement name (joined with underscore).

### Tag Extraction

| Tag | Source |
|-----|--------|
| `enterprise` | parts[0] |
| `site` | parts[1] |
| `area` | parts[2] |
| `machine` | parts[3] |
| `full_topic` | Complete original topic |

### Value Handling

- **Numeric payloads:** Stored as `floatField('value', ...)`
- **String payloads:** Truncated to 200 characters, stored as `stringField('value', ...)`

### Usage Example

```javascript
const { parseTopicToInflux } = require('./lib/influx/writer');

const topic = 'Enterprise A/Dallas Line 1/packaging/wrapper01/speed/metric';
const payload = '450.5';

const point = parseTopicToInflux(topic, payload);
// Creates Point with:
//   measurement: 'speed_metric'
//   tags: { enterprise: 'Enterprise A', site: 'Dallas Line 1', area: 'packaging', machine: 'wrapper01' }
//   field: { value: 450.5 }
```

## Function: writeSparkplugMetric

Converts a normalized Sparkplug B metric (from the decoder) to an InfluxDB Point.

### Signature

```javascript
function writeSparkplugMetric(metric: Object): Point
```

### Parameter: metric Object

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Metric name (becomes measurement) |
| `value` | number\|string\|boolean | Metric value |
| `valueType` | string | Type: int, long, float, double, boolean, string |
| `timestamp` | Date\|null | Optional metric timestamp |
| `tags.enterprise` | string | Enterprise/group ID |
| `tags.site` | string | Site/edge node ID |
| `tags.edgeNodeId` | string | Original edge node identifier |
| `tags.deviceId` | string\|null | Device ID (for device-level metrics) |
| `tags.messageType` | string | Sparkplug message type (NDATA, DDATA, etc.) |

### Tags Created

| Tag | Source |
|-----|--------|
| `enterprise` | metric.tags.enterprise |
| `site` | metric.tags.site |
| `edge_node_id` | metric.tags.edgeNodeId |
| `message_type` | metric.tags.messageType |
| `protocol` | Always `'sparkplug_b'` |
| `device_id` | metric.tags.deviceId (if present) |

### Value Type Handling

| Sparkplug Type | InfluxDB Field Method |
|----------------|----------------------|
| int, long | `intField()` |
| float, double | `floatField()` |
| boolean | `booleanField()` |
| string | `stringField()` (truncated to 200 chars) |

### Usage Example

```javascript
const { writeSparkplugMetric } = require('./lib/influx/writer');

const metric = {
  name: 'temperature',
  value: 72.5,
  valueType: 'float',
  timestamp: new Date(),
  tags: {
    enterprise: 'Enterprise B',
    site: 'Site3',
    edgeNodeId: 'Site3',
    deviceId: 'palletizer01',
    messageType: 'DDATA'
  }
};

const point = writeSparkplugMetric(metric);
// Creates Point with:
//   measurement: 'temperature'
//   tags: { enterprise: 'Enterprise B', site: 'Site3', edge_node_id: 'Site3',
//           message_type: 'DDATA', protocol: 'sparkplug_b', device_id: 'palletizer01' }
//   field: { value: 72.5 }
```

## Data Flow

```
                   MQTT Message
                        |
         +--------------+--------------+
         |                             |
    Standard Topic              Sparkplug B Topic
         |                             |
         v                             v
  parseTopicToInflux()      Sparkplug Decoder
         |                             |
         |                             v
         |                  writeSparkplugMetric()
         |                             |
         +--------------+--------------+
                        |
                        v
                 InfluxDB Point
                        |
                        v
                 writeApi.writePoint()
```

## Measurement Name Sanitization

Both functions sanitize measurement names to be InfluxDB-compatible:

```javascript
// parseTopicToInflux: Joins last 2 topic parts, removes special chars
const measurement = parts.slice(-2).join('_').replace(/[^a-zA-Z0-9_]/g, '_');

// writeSparkplugMetric: Removes special chars from metric name
const measurement = metric.name.replace(/[^a-zA-Z0-9_]/g, '_');
```

## Related Modules

| Module | Relationship |
|--------|--------------|
| [Module-Influx-Client](Module-Influx-Client) | Re-exports these functions |
| [Module-Sparkplug](Module-Sparkplug) | Provides normalized metrics for `writeSparkplugMetric` |

## See Also

- [MQTT Topic Structure](Factory-Enterprises-Explained)
- [Module-Sparkplug](Module-Sparkplug) - Sparkplug B protocol decoding
