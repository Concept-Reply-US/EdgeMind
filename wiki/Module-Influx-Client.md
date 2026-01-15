# Module: Influx Client

**Source:** `lib/influx/client.js`

## Purpose

Centralizes InfluxDB client initialization and provides access to the write and query APIs. This module serves as the single entry point for all InfluxDB interactions across the EdgeMind application.

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `influxDB` | InfluxDB | The main InfluxDB client instance |
| `writeApi` | WriteApi | API for writing data points to InfluxDB |
| `queryApi` | QueryApi | API for querying data using Flux |
| `Point` | Class | Point class for creating InfluxDB data points |
| `parseTopicToInflux` | Function | Converts MQTT topic to InfluxDB Point (re-exported from writer) |
| `writeSparkplugMetric` | Function | Writes Sparkplug B metrics to InfluxDB (re-exported from writer) |

## Configuration

The client reads configuration from `lib/config.js`:

```javascript
// Environment variables used:
INFLUXDB_URL    // Default: http://localhost:8086
INFLUXDB_TOKEN  // Required for authentication
INFLUXDB_ORG    // Default: proveit
INFLUXDB_BUCKET // Default: factory
```

## Usage Examples

### Writing Data Points

```javascript
const { writeApi, Point } = require('./lib/influx/client');

// Create a new data point
const point = new Point('temperature')
  .tag('enterprise', 'Enterprise A')
  .tag('site', 'Dallas Line 1')
  .tag('machine', 'furnace01')
  .floatField('value', 2650.5)
  .timestamp(new Date());

// Write to InfluxDB
writeApi.writePoint(point);
await writeApi.flush();
```

### Querying Data

```javascript
const { queryApi } = require('./lib/influx/client');

const fluxQuery = `
  from(bucket: "factory")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "temperature")
    |> mean()
`;

const results = [];
await new Promise((resolve, reject) => {
  queryApi.queryRows(fluxQuery, {
    next(row, tableMeta) {
      results.push(tableMeta.toObject(row));
    },
    error(error) {
      reject(error);
    },
    complete() {
      resolve();
    }
  });
});
```

### Using the Re-exported Writer Functions

```javascript
const { parseTopicToInflux, writeApi } = require('./lib/influx/client');

// Parse MQTT topic and write to InfluxDB
const topic = 'Enterprise A/Dallas Line 1/packaging/wrapper01/speed/metric';
const payload = '450.5';

const point = parseTopicToInflux(topic, payload);
writeApi.writePoint(point);
```

## Architecture

```
lib/influx/client.js
        |
        +-- Imports: @influxdata/influxdb-client
        |
        +-- Imports: lib/config.js
        |
        +-- Re-exports: lib/influx/writer.js
```

## Write API Configuration

The write API is configured with:
- **Organization:** From `CONFIG.influxdb.org`
- **Bucket:** From `CONFIG.influxdb.bucket`
- **Precision:** Nanoseconds (`'ns'`)

## Related Modules

| Module | Relationship |
|--------|--------------|
| [Module-Influx-Writer](Module-Influx-Writer) | Re-exports `parseTopicToInflux` and `writeSparkplugMetric` |
| [Module-Schema](Module-Schema) | Uses `queryApi` for schema discovery |
| [Module-OEE](Module-OEE) | Uses `queryApi` for OEE calculations |
| [Module-AI](Module-AI) | Uses `queryApi` for trend analysis |

## Error Handling

The client module does not implement explicit error handling. Errors from InfluxDB operations (connection failures, authentication errors, write failures) propagate to the calling code. Each consuming module should implement appropriate error handling.

## Performance Considerations

- The `writeApi` buffers writes and flushes periodically
- For high-throughput scenarios, call `writeApi.flush()` to force immediate writes
- The `queryApi` streams results row by row, which is memory-efficient for large result sets

## Docker Setup

```bash
docker run -d --name influxdb -p 8086:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=proveit2026 \
  -e DOCKER_INFLUXDB_INIT_ORG=proveit \
  -e DOCKER_INFLUXDB_INIT_BUCKET=factory \
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=proveit-factory-token-2026 \
  influxdb:2.7
```

## See Also

- [InfluxDB Node.js Client Documentation](https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/)
- [Flux Query Language](https://docs.influxdata.com/flux/v0/)
