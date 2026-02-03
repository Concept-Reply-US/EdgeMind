# Sparkplug B Protocol

EdgeMind automatically detects and decodes Sparkplug B messages from Enterprise B's beverage bottling operations. No configuration is required.

---

## Table of Contents

- [Overview](#overview)
- [Why Sparkplug B?](#why-sparkplug-b)
- [Topic Structure](#topic-structure)
- [Message Types](#message-types)
- [Metric Value Types](#metric-value-types)
- [Processing Flow in EdgeMind](#processing-flow-in-edgemind)
- [Enterprise B Context](#enterprise-b-context)
- [Automatic Detection](#automatic-detection)
- [See Also](#see-also)

---

## Overview

Sparkplug B is an MQTT specification designed for industrial environments. Where standard MQTT transmits data as human-readable text (JSON, CSV, or raw values), Sparkplug B encodes payloads as binary Protocol Buffers (protobuf). This produces smaller messages that transmit faster -- a meaningful advantage when machines publish telemetry at high frequency.

Enterprise B (beverage and bottling operations) uses Sparkplug B for all of its machine telemetry. EdgeMind detects Sparkplug B messages automatically by inspecting MQTT topics as they arrive, decodes the binary payloads, and writes the resulting metrics into the same InfluxDB storage used by every other enterprise. No special configuration, feature flags, or operator intervention is needed.

From the perspective of the dashboard, AI analysis, and OEE calculations, Enterprise B data looks and behaves identically to data from Enterprises A and C.

---

## Why Sparkplug B?

Standard MQTT is protocol-agnostic about payloads. A temperature reading might arrive as the plain string `72.4`, a JSON object `{"temp": 72.4}`, or a CSV row. This flexibility is convenient but introduces problems at scale:

- **Payload size.** Text encoding is verbose. A single metric update in JSON can be 5-10x larger than the same data in binary protobuf.
- **Schema ambiguity.** There is no standard way to communicate data types, timestamps, or quality codes in a plain MQTT payload.
- **Device lifecycle.** Standard MQTT has no built-in mechanism for reporting when a device comes online or goes offline in a structured way.

Sparkplug B addresses all three:

| Concern | Standard MQTT | Sparkplug B |
|---|---|---|
| Payload format | Unspecified (text, JSON, CSV) | Binary protobuf with a defined schema |
| Payload size | Larger (text-encoded values) | Smaller (binary-encoded values) |
| Data types | Implicit, must be inferred | Explicit type IDs per metric |
| Timestamps | Application-dependent | Per-metric timestamps in the payload |
| Device lifecycle | No standard mechanism | Birth/death certificates (NBIRTH, NDEATH, DBIRTH, DDEATH) |
| Metric metadata | None | Type, timestamp, quality code, and alias per metric |

For Enterprise B's bottling lines -- where dozens of machines each publish multiple metrics several times per second -- the bandwidth reduction and structured metadata are significant operational advantages.

---

## Topic Structure

Sparkplug B topics follow a strict, predictable format:

```
spBv1.0/<group_id>/<message_type>/<edge_node_id>[/<device_id>]
```

### Components

| Component | Required | Description |
|---|---|---|
| `spBv1.0` | Yes | Protocol version identifier. Always this literal value. |
| `group_id` | Yes | Logical grouping. Maps to Enterprise B's sites (e.g., `Site3`, `Site4`). |
| `message_type` | Yes | One of six defined types: `NBIRTH`, `NDEATH`, `DBIRTH`, `DDEATH`, `NDATA`, `DDATA`. |
| `edge_node_id` | Yes | Identifies the edge gateway publishing data. |
| `device_id` | No | Identifies a specific device behind the edge node. Omitted for node-level messages. |

### Examples

Edge node coming online at Site 3:
```
spBv1.0/Site3/NBIRTH/bottling-gateway-01
```

Device data update from a filler machine behind that gateway:
```
spBv1.0/Site3/DDATA/bottling-gateway-01/filler-line-02
```

Device birth certificate for a labeler:
```
spBv1.0/Site4/DBIRTH/packaging-gateway-01/labeler-03
```

---

## Message Types

Sparkplug B defines six message types that cover the full lifecycle of edge nodes and the devices behind them.

| Type | Direction | Purpose |
|---|---|---|
| `NBIRTH` | Edge Node --> Server | Edge node comes online. Declares all metrics it will publish, including names, data types, and initial values. |
| `NDEATH` | Edge Node --> Server | Edge node goes offline. Delivered via MQTT Last Will and Testament so the server is notified even on ungraceful disconnects. |
| `DBIRTH` | Edge Node --> Server | A device behind the edge node comes online. Declares the device's metric schema. |
| `DDEATH` | Edge Node --> Server | A device behind the edge node goes offline. |
| `NDATA` | Edge Node --> Server | Periodic or change-of-value metric updates from the edge node itself. |
| `DDATA` | Edge Node --> Server | Periodic or change-of-value metric updates from a device behind the edge node. |

### Birth and Death Certificates

Birth messages (`NBIRTH`, `DBIRTH`) serve as schema declarations. When an edge node or device comes online, it publishes a birth certificate containing every metric it will report, along with each metric's data type, initial value, and optional alias. This allows the server to build a complete picture of the data model before the first data message arrives.

Death messages (`NDEATH`, `DDEATH`) signal that a node or device is no longer publishing. `NDEATH` uses MQTT's Last Will and Testament feature, which means the broker delivers it automatically if the edge node disconnects unexpectedly (power loss, network failure).

---

## Metric Value Types

Each metric in a Sparkplug B payload includes an explicit type identifier. EdgeMind uses these types to determine how to store and interpret values.

| Type ID | Type | Description |
|---|---|---|
| 1 | Int8 | 8-bit signed integer |
| 2 | Int16 | 16-bit signed integer |
| 3 | Int32 | 32-bit signed integer |
| 4 | Int64 | 64-bit signed integer |
| 5 | UInt8 | 8-bit unsigned integer |
| 6 | UInt16 | 16-bit unsigned integer |
| 7 | UInt32 | 32-bit unsigned integer |
| 8 | UInt64 | 64-bit unsigned integer |
| 9 | Float | 32-bit IEEE 754 float |
| 10 | Double | 64-bit IEEE 754 double |
| 11 | Boolean | True or false |
| 12 | String | UTF-8 encoded string |

All integer and floating-point types (IDs 1-10) are stored as numeric values in InfluxDB and are eligible for trend analysis, OEE calculation, and anomaly detection. Boolean and string types are stored but handled differently depending on context.

---

## Processing Flow in EdgeMind

When an MQTT message arrives, EdgeMind processes it through the following pipeline:

```
MQTT Message Received
        |
        v
  Topic starts with "spBv1.0/"?
       / \
     Yes   No
      |      |
      v      v
 Sparkplug   Standard text
 B decoder   processing
      |      |
      v      v
 Extract metrics:        Parse topic path
 - name                  and payload value
 - typed value
 - timestamp
 - quality code
      |      |
      v      v
 Map to InfluxDB tags:
 enterprise, site, area, machine
      |      |
      +------+
      |
      v
 Write to InfluxDB
 (same bucket, same schema)
      |
      v
 Available for:
 - Dashboard display
 - OEE calculation
 - AI trend analysis
 - Anomaly detection
```

Step by step:

1. **Message arrival.** The MQTT client receives a message on any topic (EdgeMind subscribes to `#`).
2. **Protocol detection.** EdgeMind checks whether the topic starts with `spBv1.0/`. If it does, the message is routed to the Sparkplug B decoder. If not, it follows the standard text processing path.
3. **Protobuf decoding.** The binary payload is decoded using the Sparkplug B protobuf schema. A single Sparkplug B message can contain multiple metrics.
4. **Metric extraction.** Each metric in the decoded payload is extracted with its name, typed value, timestamp, and quality code.
5. **Tag mapping.** Metrics are mapped to InfluxDB points with the standard EdgeMind tag set: `enterprise`, `site`, `area`, and `machine`. The Sparkplug B topic components (`group_id`, `edge_node_id`, `device_id`) are mapped to these tags.
6. **InfluxDB write.** Data is written to the same `factory` bucket used by all enterprises.
7. **Downstream processing.** From this point forward, Enterprise B data is indistinguishable from Enterprise A or C data. Claude's AI analysis, OEE calculations, and dashboard rendering all process it identically.

---

## Enterprise B Context

Enterprise B represents beverage bottling operations across multiple sites. Its Sparkplug B telemetry covers four main categories.

### OEE Metrics

- Overall OEE (percentage)
- Availability (uptime vs. planned production time)
- Performance (actual throughput vs. theoretical maximum)
- Quality (good units vs. total units produced)

### Production Metrics

- Bottles per minute
- Line speed
- Fill volume (per bottle and per batch)
- Batch count and batch duration

### Equipment Metrics

- Motor current draw (amps)
- Conveyor belt speed
- Temperature (ambient, process, and coolant)
- Pressure readings (fill head, CO2, air)

### Quality Metrics

- Rejection rate (percentage of bottles rejected)
- Fill accuracy (deviation from target volume)
- Label alignment score
- Cap torque measurements

These metrics are published at varying frequencies. OEE and production metrics typically update every few seconds. Equipment metrics may update multiple times per second during active production.

---

## Automatic Detection

EdgeMind requires zero configuration to handle Sparkplug B data. Detection and decoding happen at runtime based solely on topic inspection.

**How it works:**

- Every incoming MQTT message's topic is checked against the prefix `spBv1.0/`.
- Messages matching that prefix are decoded as Sparkplug B protobuf payloads.
- All other messages are processed as standard text MQTT payloads.
- No configuration flags, environment variables, or settings control this behavior.

**What this means in practice:**

- Enterprise B can be added to or removed from the MQTT broker without any changes to EdgeMind's configuration or code.
- If a new enterprise begins publishing Sparkplug B data, EdgeMind will detect and decode it automatically.
- Standard text MQTT and Sparkplug B messages coexist on the same broker without conflict.
- The detection logic runs on every message with negligible overhead -- it is a simple string prefix check before any decoding occurs.

---

## See Also

- [[Module-Sparkplug]] -- Implementation details of the Sparkplug B decoder module
- [[AI-Trend-Analysis]] -- How Claude analyzes trends across all enterprises, including Sparkplug B data
