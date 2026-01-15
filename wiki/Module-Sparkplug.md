# Module: Sparkplug

**Source:** `lib/sparkplug/decoder.js`

## Purpose

Decodes Sparkplug B protocol messages used by Enterprise B. Sparkplug B is an MQTT-based industrial protocol that uses Protocol Buffers (protobuf) for efficient binary encoding of telemetry data.

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `isSparkplugTopic` | Function | Check if topic is Sparkplug B format |
| `parseSparkplugTopic` | Function | Parse Sparkplug topic into components |
| `decodePayload` | Function | Decode protobuf binary payload |
| `extractMetrics` | Function | Extract normalized metrics from decoded payload |
| `SPARKPLUG_MESSAGE_TYPES` | Object | Enum of Sparkplug message types |

## Sparkplug B Overview

Sparkplug B is defined by the Eclipse Foundation for IIoT (Industrial Internet of Things). Key characteristics:

- **Binary Encoding:** Uses Protocol Buffers for compact messages
- **State Management:** Birth/death certificates for device lifecycle
- **Namespace:** Topics start with `spBv1.0/`

## Message Types

```javascript
const SPARKPLUG_MESSAGE_TYPES = {
  NBIRTH: 'NBIRTH', // Node birth certificate
  NDEATH: 'NDEATH', // Node death certificate
  DBIRTH: 'DBIRTH', // Device birth certificate
  DDEATH: 'DDEATH', // Device death certificate
  NDATA: 'NDATA',   // Node data
  DDATA: 'DDATA',   // Device data
  NCMD: 'NCMD',     // Node command
  DCMD: 'DCMD',     // Device command
  STATE: 'STATE'    // Edge of Network (EoN) state
};
```

### Message Type Meanings

| Type | Description | Contains Metrics |
|------|-------------|------------------|
| NBIRTH | Edge node comes online | Yes (node metadata) |
| NDEATH | Edge node goes offline | No |
| DBIRTH | Device connected to node | Yes (device metadata) |
| DDEATH | Device disconnected | No |
| NDATA | Node telemetry data | Yes |
| DDATA | Device telemetry data | Yes |
| NCMD | Command to node | N/A |
| DCMD | Command to device | N/A |

## Topic Structure

```
spBv1.0 / <group_id> / <message_type> / <edge_node_id> / [<device_id>]
   |          |             |               |                |
namespace  enterprise    NDATA, etc.      site           device
```

### Examples

```
spBv1.0/Enterprise B/NDATA/Site3
spBv1.0/Enterprise B/DDATA/Site3/palletizer01
spBv1.0/Enterprise B/NBIRTH/Site3
```

## Function: isSparkplugTopic

Checks if an MQTT topic follows the Sparkplug B format.

### Signature

```javascript
function isSparkplugTopic(topic: string): boolean
```

### Usage Example

```javascript
const { isSparkplugTopic } = require('./lib/sparkplug/decoder');

isSparkplugTopic('spBv1.0/Enterprise B/NDATA/Site3');
// Returns: true

isSparkplugTopic('Enterprise A/Dallas Line 1/packaging/...');
// Returns: false
```

## Function: parseSparkplugTopic

Parses a Sparkplug B topic into its component parts.

### Signature

```javascript
function parseSparkplugTopic(topic: string): {
  namespace: string,
  groupId: string,
  messageType: string,
  edgeNodeId: string,
  deviceId: string | null
}
```

### Usage Example

```javascript
const { parseSparkplugTopic } = require('./lib/sparkplug/decoder');

const parts = parseSparkplugTopic('spBv1.0/Enterprise B/DDATA/Site3/palletizer01');
// Returns:
// {
//   namespace: 'spBv1.0',
//   groupId: 'Enterprise B',
//   messageType: 'DDATA',
//   edgeNodeId: 'Site3',
//   deviceId: 'palletizer01'
// }
```

## Function: decodePayload

Decodes a Sparkplug B protobuf binary payload.

### Signature

```javascript
function decodePayload(buffer: Buffer): Object
```

### Return Structure

```javascript
{
  timestamp: 1705258200000,  // Payload timestamp (ms)
  seq: 42,                   // Sequence number
  metrics: [
    {
      name: 'temperature',
      timestamp: 1705258200000,
      intValue: null,
      longValue: null,
      floatValue: 72.5,
      doubleValue: null,
      booleanValue: null,
      stringValue: null
    }
    // ...
  ]
}
```

### Error Handling

```javascript
const { decodePayload } = require('./lib/sparkplug/decoder');

try {
  const decoded = decodePayload(buffer);
} catch (error) {
  // Error: "Failed to decode Sparkplug payload: <reason>"
}
```

## Function: extractMetrics

Extracts and normalizes metrics from a decoded Sparkplug payload into a format ready for InfluxDB.

### Signature

```javascript
function extractMetrics(topic: string, decodedPayload: Object): Array<{
  name: string,
  value: number | string | boolean,
  valueType: string,
  timestamp: Date | null,
  tags: {
    enterprise: string,
    site: string,
    edgeNodeId: string,
    deviceId: string | null,
    messageType: string
  }
}>
```

### Usage Example

```javascript
const { extractMetrics, decodePayload } = require('./lib/sparkplug/decoder');

const topic = 'spBv1.0/Enterprise B/DDATA/Site3/palletizer01';
const decoded = decodePayload(buffer);
const metrics = extractMetrics(topic, decoded);

// Returns:
// [
//   {
//     name: 'temperature',
//     value: 72.5,
//     valueType: 'float',
//     timestamp: Date('2026-01-14T18:30:00.000Z'),
//     tags: {
//       enterprise: 'Enterprise B',
//       site: 'Site3',
//       edgeNodeId: 'Site3',
//       deviceId: 'palletizer01',
//       messageType: 'DDATA'
//     }
//   }
// ]
```

### Skipped Messages

The function skips DEATH messages (NDEATH, DDEATH) as they don't contain useful metrics.

## Value Type Extraction

Sparkplug metrics can store values in different fields depending on type:

| Sparkplug Field | Data Type | EdgeMind valueType |
|-----------------|-----------|-------------------|
| `intValue` | Int8, Int16, Int32, UInt8, UInt16, UInt32 | 'int' |
| `longValue` | Int64, UInt64, DateTime | 'long' |
| `floatValue` | Float | 'float' |
| `doubleValue` | Double | 'double' |
| `booleanValue` | Boolean | 'boolean' |
| `stringValue` | String, Text, UUID | 'string' |

### BigInt Handling

For long values that exceed JavaScript's safe integer range:

```javascript
if (typeof longVal === 'bigint') {
  if (longVal > BigInt(Number.MAX_SAFE_INTEGER)) {
    console.warn(`Precision loss converting BigInt...`);
  }
  longVal = Number(longVal);
}
```

## Data Flow

```
MQTT Message (Sparkplug B)
        |
        v
isSparkplugTopic() ─── false ──> Standard Topic Handler
        |
      true
        |
        v
parseSparkplugTopic()
        |
        v
decodePayload()
        |
        v
extractMetrics()
        |
        v
For each metric:
        |
        v
writeSparkplugMetric() ──> InfluxDB Point
        |
        v
writeApi.writePoint()
```

## Integration with Server

In `server.js`, Sparkplug messages are handled separately:

```javascript
const { isSparkplugTopic, extractMetrics, decodePayload } = require('./lib/sparkplug/decoder');
const { writeSparkplugMetric, writeApi } = require('./lib/influx/client');

mqttClient.on('message', (topic, message) => {
  if (isSparkplugTopic(topic)) {
    try {
      const decoded = decodePayload(message);
      const metrics = extractMetrics(topic, decoded);

      for (const metric of metrics) {
        const point = writeSparkplugMetric(metric);
        writeApi.writePoint(point);
      }
    } catch (error) {
      console.error('Sparkplug decode error:', error.message);
    }
  }
});
```

## Dependencies

```javascript
const sparkplug = require('sparkplug-payload').get('spBv1.0');
```

The `sparkplug-payload` npm package provides the protobuf decoder for Sparkplug B v1.0.

## Enterprise B Specifics

Enterprise B (Beverage Bottling) uses Sparkplug B exclusively:

- **Edge Nodes:** Site3, etc.
- **Devices:** palletizer01, filler01, labeler01, etc.
- **Metrics:** OEE components, counts, speeds

### Common Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `countinfeed` | int | Bottles entering line |
| `countoutfeed` | int | Bottles leaving line |
| `countdefect` | int | Defective bottles |
| `oee` | float | Overall Equipment Effectiveness |
| `availability` | float | Machine availability |
| `performance` | float | Machine performance |
| `quality` | float | Product quality rate |

## Related Modules

| Module | Relationship |
|--------|--------------|
| [Module-Influx-Writer](Module-Influx-Writer) | `writeSparkplugMetric()` writes decoded metrics |
| [Module-Influx-Client](Module-Influx-Client) | Re-exports `writeSparkplugMetric()` |

## Troubleshooting

### "Failed to decode Sparkplug payload"

- Verify the message is actually Sparkplug B (binary, not JSON)
- Check if the topic starts with `spBv1.0/`
- Ensure the buffer is not empty

### Precision Loss Warnings

```
Precision loss converting BigInt 9007199254740993 to Number
```

This occurs when timestamps or counters exceed JavaScript's safe integer range. The value is still usable but may have reduced precision.

## See Also

- [Eclipse Sparkplug Specification](https://www.eclipse.org/tahu/spec/Sparkplug%20Topic%20Namespace%20and%20State%20ManagementV2.2-with%20errata.pdf)
- [Factory Enterprises Explained](Factory-Enterprises-Explained) - Enterprise B details
