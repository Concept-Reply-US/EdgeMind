# Equipment Specifications and Thresholds

**Document Version:** 1.0
**Last Updated:** 2026-02-16
**Purpose:** Equipment specifications, safe operating ranges, and thresholds for EdgeMind factory intelligence system. Used by AI agents for anomaly detection, root cause analysis, and operational recommendations.

---

## Table of Contents

1. [Enterprise A - Glass Manufacturing](#enterprise-a---glass-manufacturing)
2. [Enterprise B - Beverage Bottling](#enterprise-b---beverage-bottling)
3. [Enterprise C - Bioprocessing / Pharmaceutical](#enterprise-c---bioprocessing--pharmaceutical)
4. [Anomaly Detection Profiles](#anomaly-detection-profiles)
5. [OEE Calculation Reference](#oee-calculation-reference)
6. [MQTT Topic Structure](#mqtt-topic-structure)

---

## Enterprise A - Glass Manufacturing

**Industry:** Glass Manufacturing
**Domain:** glass
**OEE Calculation:** Tier 1 (pre-computed OEE) or Tier 2 (A x P x Q components)
**Analysis Mode:** OEE-based continuous production

### Equipment Specifications

#### Furnace
- **Type:** glass-furnace
- **Normal Temperature Range:** 2650-2750°F
- **Unit:** °F
- **Safe Range - Furnace Temperature:**
  - Minimum: 2600°F
  - Maximum: 2800°F
  - Unit: °F
  - Status: Critical parameter
- **Safe Range - Crown Temperature:**
  - Minimum: 2400°F
  - Maximum: 2600°F
  - Unit: °F

#### ISMachine (Individual Section Machine)
- **Type:** forming-machine
- **Normal Cycle Time:** 8-12 seconds
- **Unit:** seconds

#### Lehr (Annealing Oven)
- **Type:** annealing-oven
- **Temperature Gradient:** 1050°F to 400°F (cooling gradient)

### Critical Metrics
- temperature
- gob_weight
- defect_count

### Operational Concerns
- thermal_shock
- crown_temperature
- refractory_wear

### Waste Metrics and Thresholds

**Waste Measurement Fields:**
- OEE_Waste
- Production_DefectCHK (chips or checks - mechanical damage)
- Production_DefectDIM (dimensional issues - size/shape out of spec)
- Production_DefectSED (seeds or bubbles - material defects)
- Production_RejectCount

**Waste Thresholds:**
- Warning Threshold: 10 defects/hr
- Critical Threshold: 25 defects/hr
- Unit: defects/hr

### OEE Measurement Patterns

**Overall OEE:**
- measurement: metric_oee

**Components:**
- Availability: metric_availability
- Performance: metric_performance
- Quality: metric_quality

**Value Format:** May be decimal (0-1 range) or percentage (0-100). Values at or below 1.5 are treated as decimal and multiplied by 100.

---

## Enterprise B - Beverage Bottling

**Industry:** Beverage Bottling
**Domain:** beverage
**OEE Calculation:** Tier 1 (pre-computed OEE) or Tier 2 (A x P x Q components)
**Analysis Mode:** OEE-based continuous production

### Equipment Specifications

#### Filler (Asset 23)
- **Type:** bottle-filler (high-speed rotary filler)
- **Normal Speed Range:** 400-600 BPM (bottles per minute)
- **Unit:** BPM
- **Safe Range - Filler Speed:**
  - Minimum: 350 BPM
  - Maximum: 650 BPM
  - Unit: BPM

#### Labeler
- **Type:** labeling-machine
- **Normal Accuracy:** 99.5%

#### Palletizer
- **Type:** palletizing-robot
- **Normal Cycle Time:** 10-15 seconds

#### Washer
- **Type:** bottle-washer
- **Normal OEE Range:** 90-98%

#### CapLoader (Asset 22)
- **Type:** capping-machine
- **Normal Torque Range:** 12-22 Nm
- **Unit:** Nm
- **Safe Range - Capper Torque:**
  - Minimum: 10 Nm
  - Maximum: 25 Nm
  - Warning Threshold: 22 Nm
  - Unit: Nm
  - Status: Critical parameter for seal quality
- **Safe Range - Torque Variance:**
  - Maximum: 5 Nm
  - Warning Threshold: 3 Nm
  - Unit: Nm

#### MixingVat (Vat01 "Jeff" - Asset 31)
- **Type:** mixing-vessel
- **Normal Temperature Range:** 30-35°C
- **Unit:** °C
- **Safe Range - Vat Temperature:**
  - Minimum: 30°C
  - Maximum: 35°C
  - Warning Minimum: 31°C
  - Warning Maximum: 34°C
  - Unit: °C

### Critical Metrics
- countinfeed (input counter)
- countoutfeed (output counter)
- countdefect (defect counter)
- oee (overall equipment effectiveness)

**Raw Counter Fields:** countinfeed, countoutfeed, countdefect

### Operational Concerns
- line_efficiency
- changeover_time
- reject_rate
- bearing_degradation
- torque_drift
- thermal_drift
- cascade_failure

### Safe Operating Ranges

#### Reject Rate
- Maximum: 2%
- Warning Threshold: 1.5%
- Unit: %
- Status: Critical quality metric

#### Vibration (Bearing Health Indicator)
- Maximum: 3.0 mm/s
- Warning Threshold: 2.5 mm/s
- Unit: mm/s
- Status: Critical parameter for predictive maintenance

#### Defect Rate
- Maximum: 2%
- Warning Threshold: 1.5%
- Unit: %
- Status: Critical parameter

### Waste Metrics and Thresholds

**Waste Measurement Fields:**
- count_defect
- input_countdefect
- workorder_quantitydefect

**Waste Thresholds:**
- Warning Threshold: 50 defects/hr
- Critical Threshold: 100 defects/hr
- Unit: defects/hr

### OEE Measurement Patterns

**Overall OEE:**
- measurement: metric_oee

**Components:**
- Availability: OEE_Availability
- Performance: OEE_Performance
- Quality: OEE_Quality

**Value Format:** May be decimal (0-1 range) or percentage (0-100). Values at or below 1.5 are treated as decimal and multiplied by 100.

---

## Enterprise C - Bioprocessing / Pharmaceutical

**Industry:** Bioprocessing / Pharmaceutical
**Domain:** pharma
**Batch Control:** ISA-88 standard
**Analysis Mode:** batch (NOT OEE-based)

**IMPORTANT:** Enterprise C does NOT use OEE metrics. All analysis uses batch control terminology:
- Yield rate (not quality)
- Batch completion rate (not performance)
- Process availability (not equipment availability)
- Phase progress (not cycle time)

### Equipment Specifications

#### CHR01 - Chromatography Unit
- **Type:** chromatography
- **Full Name:** Chromatography Unit
- **Primary Phase:** purification
- **State Metric:** CHR01_STATE
- **Phase Metric:** CHR01_PHASE
- **Critical Process Variables (PV):**
  - chrom_CHR01_PT002_PV (pressure)
  - chrom_CHR01_AT001_PV (attenuation/UV absorbance)
  - chrom_CHR01_FT002_PV (flow rate)

**ISA-88 Phases:**
- EQUILIBRATION
- LOADING
- WASHING
- ELUTION
- REGENERATION

#### SUB250 - Single-Use Bioreactor 250L
- **Type:** single-use-bioreactor
- **Full Name:** Single-Use Bioreactor 250L
- **Capacity:** 250 liters
- **Primary Phase:** cultivation
- **State Metric:** SUB250_STATE
- **Phase Metric:** SUB250_PHASE
- **Critical Process Variables (PV):**
  - sub_AIC_250_003_PV_pH (pH control)
  - sub_AIC_250_001_PV_percent (dissolved oxygen %)
  - sub_TIC_250_001_PV_Celsius (temperature control)

**ISA-88 Phases:**
- INOCULATION
- GROWTH (also called EXPONENTIAL GROWTH)
- PRODUCTION (also called STATIONARY phase)
- HARVEST

#### SUM500 - Single-Use Mixer 500L
- **Type:** single-use-mixer
- **Full Name:** Single-Use Mixer 500L
- **Capacity:** 500 liters
- **Primary Phase:** preparation
- **State Metric:** SUM500_STATUS
- **Phase Metric:** SUM500_PHASE
- **Critical Process Variables (PV):**
  - sum_TIC_500_001_PV (temperature indicator/controller)
  - sum_SIC_500_001_PV (speed indicator/controller)
  - sum_WIC_500_001_PV (weight indicator/controller)

**ISA-88 Phases:**
- CHARGING
- MIXING
- TRANSFER

#### TFF300 - Tangential Flow Filtration 300
- **Type:** tangential-flow-filtration
- **Full Name:** Tangential Flow Filtration 300
- **Primary Phase:** filtration
- **State Metric:** TFF300_STATE
- **Phase Metric:** TFF300_PHASE
- **Critical Process Variables (PV):**
  - tff_PIC_300_001_PV (pressure indicator/controller)
  - tff_FIC_300_001_PV (flow indicator/controller)
  - tff_TMP_300_PV (transmembrane pressure)

**ISA-88 Phases:**
- PRIMING
- CONCENTRATION
- DIAFILTRATION
- RECOVERY

### Critical Metrics (State and Phase)
- STATE (equipment operating state)
- PHASE (current batch phase)
- BATCH_ID (unique batch identifier)
- pH (acidity/alkalinity)
- dissolved_oxygen (DO% - cell culture viability)
- temperature (process temperature)
- pressure (process pressure)

### Operational Concerns
- contamination (sterility breach)
- batch_deviation (parameter excursions)
- sterility (aseptic conditions)
- phase_timeout (phase taking longer than expected)
- PV_out_of_range (process variable excursion)

### Safe Operating Ranges

#### pH (Critical Parameter)
- Minimum: 6.8 pH
- Maximum: 7.4 pH
- Unit: pH
- Status: Critical parameter

#### Dissolved Oxygen
- Minimum: 30%
- Maximum: 70%
- Unit: %

#### Temperature (Process)
- Minimum: 35°C
- Maximum: 39°C
- Unit: °C

#### Pressure (Process)
- Minimum: 0.5 bar
- Maximum: 2.0 bar
- Unit: bar

### Cleanroom Thresholds

#### PM2.5 (Particulate Matter)
- Warning Threshold: 5 µg/m³
- Critical Threshold: 10 µg/m³
- Unit: µg/m³

#### Cleanroom Temperature
- Minimum: 18°C
- Maximum: 25°C
- Unit: °C

#### Cleanroom Humidity
- Minimum: 40%
- Maximum: 60%
- Unit: %

### Waste Metrics and Thresholds

**Waste Measurement Fields:**
- chrom_CHR01_WASTE_PV (chromatography waste volume)

**Waste Thresholds:**
- Warning Threshold: 5 liters
- Critical Threshold: 15 liters
- Unit: L (liters)

### Key Batch Metrics

**NOT OEE:** Enterprise C uses batch control metrics.

**Batch Performance Metrics:**
- Batch Yield: Product quantity from a batch (kg, L, units)
- Titer: Concentration of product (g/L)
- Batch Cycle Time: Time from start to completion
- Right-First-Time: Batches completed without rework
- Golden Batch: Reference profile for optimal processing

---

## Anomaly Detection Profiles

The demo engine and anomaly detection system use these profiles to define normal ranges and severity thresholds for simulated anomalies.

### Vibration Anomaly Profile
- **Unit:** mm/s
- **Normal Range:** 1.5-3.0 mm/s
- **Severity Thresholds (Peak Values):**
  - Mild: 5.0 mm/s
  - Moderate: 8.0 mm/s
  - Severe: 12.0 mm/s
- **Publish Interval:** 5000 ms (5 seconds)
- **Noise:** ±0.3 mm/s

**Typical Use Case:** Bearing degradation on high-speed rotary equipment (fillers, centrifuges)

### Temperature Anomaly Profile
- **Unit:** °C
- **Normal Range:** 30-45°C
- **Severity Thresholds (Peak Values):**
  - Mild: 50°C
  - Moderate: 60°C
  - Severe: 75°C
- **Publish Interval:** 5000 ms (5 seconds)
- **Noise:** ±0.5°C

**Typical Use Case:** Process parameter drift on mixing vats, cooling jackets, thermal processing equipment

### Pressure Anomaly Profile
- **Unit:** bar
- **Normal Range:** 2.0-3.5 bar
- **Severity Thresholds (Peak Values):**
  - Mild: 4.0 bar
  - Moderate: 5.5 bar
  - Severe: 7.0 bar
- **Publish Interval:** 5000 ms (5 seconds)
- **Noise:** ±0.1 bar

**Typical Use Case:** Pressure excursions in filtration systems, hydraulic systems, pneumatic controls

### Torque Anomaly Profile
- **Unit:** Nm (Newton-meters)
- **Normal Range:** 10-25 Nm
- **Severity Thresholds (Peak Values):**
  - Mild: 30 Nm
  - Moderate: 40 Nm
  - Severe: 55 Nm
- **Publish Interval:** 5000 ms (5 seconds)
- **Noise:** ±1.0 Nm

**Typical Use Case:** Clutch wear on capping machines, torque drift indicating mechanical degradation

### Efficiency Anomaly Profile
- **Unit:** % (percentage)
- **Normal Range:** 85-95%
- **Severity Thresholds (Drop Values - lower is worse):**
  - Mild: 75%
  - Moderate: 60%
  - Severe: 45%
- **Publish Interval:** 5000 ms (5 seconds)
- **Noise:** ±2.0%

**Typical Use Case:** OEE degradation, line efficiency drops, throughput reductions

---

## OEE Calculation Reference

**OEE (Overall Equipment Effectiveness)** is calculated as:

```
OEE = Availability × Performance × Quality
```

Where:
- **Availability** = Run Time / Planned Production Time
  - Losses: breakdowns, changeovers, setup time
- **Performance** = (Ideal Cycle Time × Total Count) / Run Time
  - Losses: slow cycles, small stops, reduced speed
- **Quality** = Good Count / Total Count
  - Losses: defects, rework, scrap

### World-Class Benchmarks

- **World-Class OEE:** 85%
- **World-Class Availability:** 90%
- **World-Class Performance:** 95%
- **World-Class Quality:** 99.9%

### Tier-Based OEE Calculation System

The EdgeMind system uses a tiered approach to calculate OEE based on available data:

#### Tier 1: Pre-Computed Overall OEE
- **Method:** Uses directly published OEE measurement
- **Confidence:** 0.95 (95%)
- **Measurements Used:**
  - Enterprise A: metric_oee
  - Enterprise B: metric_oee
- **Also Queries (if available):** A/P/Q components for diagnostic purposes

#### Tier 2: Calculated from A × P × Q Components
- **Method:** Multiplies Availability, Performance, and Quality
- **Confidence:** 0.90 (90%)
- **Formula:** `OEE = (A / 100) × (P / 100) × (Q / 100) × 100`
- **Measurements Used:**
  - Enterprise A: metric_availability, metric_performance, metric_quality
  - Enterprise B: OEE_Availability, OEE_Performance, OEE_Quality

#### Tier 3: Calculated from Raw Counters (Not Currently Implemented)
- **Method:** Calculate from raw production counters
- **Requires:** Production counts, downtime logs, cycle time data

#### Tier 4: Insufficient Data
- **Method:** No OEE calculation possible
- **Confidence:** 0.0 (0%)
- **Reason:** Required measurements not available in InfluxDB

### Value Normalization

OEE values may be stored in two formats:
1. **Decimal Format (0-1 range):** Example: 0.85 means 85%
2. **Percentage Format (0-100 range):** Example: 85 means 85%

**Normalization Rule:** Values at or below 1.5 are treated as decimal and multiplied by 100. Values above 1.5 are already percentages.

**Decimal Threshold:** 1.5

### Enterprise-Specific OEE Configuration

**Enterprise A (Glass Manufacturing):**
- Uses Tier 1 or Tier 2 calculation
- Measurement pattern: metric_*

**Enterprise B (Beverage Bottling):**
- Uses Tier 1 or Tier 2 calculation
- Measurement pattern: metric_oee (overall), OEE_* (components)

**Enterprise C (Pharmaceutical):**
- **Does NOT use OEE**
- Uses ISA-88 batch control metrics instead
- Refer to batch performance metrics (yield, titer, cycle time)

---

## MQTT Topic Structure

MQTT topics from the ProveIt! virtual factory follow this hierarchical pattern:

```
Enterprise {A|B|C}/Site{N}/area/machine/component/metric/type
```

### Topic Hierarchy

1. **Enterprise** - Enterprise name (Enterprise A, Enterprise B, Enterprise C)
2. **Site** - Site identifier (Dallas Line 1, Site1, Site2, Site3, etc.)
3. **Area** - Production area (packaging, fillerproduction, liquidprocessing, palletizing, etc.)
4. **Machine** - Machine identifier (filler, washer, caploader, vat01, palletizermanual01, etc.)
5. **Component** - Machine component (optional - workstation, processdata, metric, etc.)
6. **Metric** - Measurement name (oee, vibration, temperature, countinfeed, state, etc.)
7. **Type** - Metric type (optional - level, actual, setpoint, etc.)

### Example Topics

**Enterprise A (Glass):**
```
Enterprise A/Dallas Line 1/packaging/...
```

**Enterprise B (Beverage):**
```
Enterprise B/Site1/fillerproduction/fillingline01/filler/processdata/vibration/level
Enterprise B/Site1/fillerproduction/fillingline01/filler/metric/input/rateactual
Enterprise B/Site1/liquidprocessing/mixroom01/vat01/processdata/process/temperature
Enterprise B/Site1/fillerproduction/fillingline01/caploader/processdata/torque/actual
Enterprise B/Site1/fillerproduction/fillingline01/washer/metric/oee
Enterprise B/Site3/palletizing/palletizermanual01/workstation/metric/oee
```

**Enterprise C (Pharmaceutical):**
```
Enterprise C/Site{N}/bioreactor/SUB250/state
Enterprise C/Site{N}/chromatography/CHR01/phase
Enterprise C/Site{N}/filtration/TFF300/pressure
```

### InfluxDB Mapping

MQTT topics are parsed and written to InfluxDB with the following structure:

**Tags:**
- `enterprise` - Enterprise name
- `site` - Site identifier
- `area` - Production area
- `machine` - Machine identifier
- `full_topic` - Complete MQTT topic

**Field:**
- `value` - Numeric value (float) or string value

**Measurement Name:**
- Last 2 parts of topic path joined with underscore
- Example: `vibration/level` → measurement name: `vibration_level`
- Example: `metric/oee` → measurement name: `metric_oee`

### Querying Patterns

**Get all measurements for an enterprise:**
```flux
from(bucket: "factory")
  |> range(start: -1h)
  |> filter(fn: (r) => r.enterprise == "Enterprise B")
```

**Get specific metric across all sites:**
```flux
from(bucket: "factory")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "metric_oee")
  |> filter(fn: (r) => r.enterprise == "Enterprise B")
```

**Get equipment state for specific machine:**
```flux
from(bucket: "factory")
  |> range(start: -1h)
  |> filter(fn: (r) => r.machine == "filler")
  |> filter(fn: (r) => r._measurement =~ /state/)
```

---

## Document Metadata

**Schema Version:** 1.0
**Coverage:**
- Enterprise A: Glass Manufacturing (3 equipment types, 2 critical safe ranges)
- Enterprise B: Beverage Bottling (6 equipment types, 7 critical safe ranges)
- Enterprise C: Bioprocessing/Pharmaceutical (4 equipment types, ISA-88 batch control, 7 critical safe ranges)

**Data Sources:**
- `/config/enterprises/enterprise-a.json`
- `/config/enterprises/enterprise-b.json`
- `/config/enterprises/enterprise-c.json`
- `/lib/domain-context.js`
- `/lib/demo/profiles.js`
- `/lib/demo/scenarios.js`
- `/lib/oee/index.js`
- `/lib/config.js`
- `/infra/agent_instructions/*.txt`

**Intended Use:**
- AI agent context retrieval via Bedrock Knowledge Base
- Anomaly detection threshold configuration
- Root cause analysis reference
- Operational recommendations
- CMMS work order generation

**Maintenance:**
- Update this document when enterprise configurations change
- Update when new equipment types are added
- Update when safe ranges are modified
- Update when OEE calculation methods change

---

**End of Document**
