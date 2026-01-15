# Factory Enterprises Explained

The ProveIt! Conference virtual factory simulates three distinct manufacturing enterprises, each representing a different industry vertical. EdgeMind applies domain-specific context to understand the unique characteristics, critical metrics, and safety thresholds of each enterprise.

## Enterprise A: Glass Manufacturing

### Industry Profile

Enterprise A simulates a glass container manufacturing operation. Glass manufacturing is a continuous, high-temperature process where molten glass is formed into containers (bottles, jars) through precision-controlled equipment.

### Equipment Types

| Equipment | Type | Role |
|-----------|------|------|
| Furnace | `glass-furnace` | Melts raw materials (silica, soda ash, limestone) at extreme temperatures. The heart of the operation. |
| IS Machine | `forming-machine` | Individual Section machine that forms molten glass "gobs" into container shapes using compressed air and molds. |
| Lehr | `annealing-oven` | Annealing oven that slowly cools formed containers to relieve internal stresses and prevent cracking. |

### Critical Metrics

- **temperature** - Furnace and lehr temperatures are mission-critical
- **gob_weight** - Weight of molten glass drops affects container consistency
- **defect_count** - Quality defects tracked in real-time

### Operating Parameters

**Furnace Temperature:**
- Normal range: 2650-2750 F
- Critical threshold: Below 2600 F or above 2800 F
- Unit: Degrees Fahrenheit

**Crown Temperature:**
- Normal range: 2400-2600 F
- Measured at the top of the furnace

**IS Machine Cycle Time:**
- Normal range: 8-12 seconds per gob
- Faster cycles may indicate quality issues

**Lehr Temperature Gradient:**
- Inlet: ~1050 F
- Outlet: ~400 F
- Controlled cooling prevents thermal shock

### Industry Concerns

1. **Thermal Shock** - Rapid temperature changes can crack glass
2. **Crown Temperature** - Hot spots at furnace top indicate refractory problems
3. **Refractory Wear** - Furnace lining degradation affects product quality

### Waste Metrics and Thresholds

EdgeMind monitors these waste indicators:
- `OEE_Waste`
- `Production_DefectCHK` (check defects)
- `Production_DefectDIM` (dimensional defects)
- `Production_DefectSED` (seed/bubble defects)
- `Production_RejectCount`

**Thresholds:**
- Warning: 10 defects/hour
- Critical: 25 defects/hour

### Example MQTT Topics

```
Enterprise A/Dallas Line 1/forming/ISMachine01/temperature/PV
Enterprise A/Dallas Line 1/melting/Furnace01/crown/temperature
Enterprise A/Dallas Line 1/annealing/Lehr01/zone3/temperature
Enterprise A/Dallas Line 1/packaging/inspector/defect_count
```

---

## Enterprise B: Beverage Bottling

### Industry Profile

Enterprise B simulates a multi-site beverage bottling operation. High-speed packaging lines fill, cap, label, and palletize bottles across nine geographic sites. Speed, efficiency, and minimal waste are the primary drivers.

### Equipment Types

| Equipment | Type | Role |
|-----------|------|------|
| Filler | `bottle-filler` | Fills bottles at high speed (400-600 bottles per minute). Precision filling prevents overfill waste and underfill complaints. |
| Labeler | `labeling-machine` | Applies labels with 99.5% accuracy requirement. Mislabeled bottles must be rejected. |
| Palletizer | `palletizing-robot` | Stacks cases onto pallets for shipping. Cycle time of 10-15 seconds per layer. |

### Critical Metrics

- **countinfeed** - Bottles entering the line
- **countoutfeed** - Bottles leaving the line
- **countdefect** - Rejected bottles
- **oee** - Overall Equipment Effectiveness

### Operating Parameters

**Filler Speed:**
- Normal range: 350-650 bottles per minute (BPM)
- Below 350 BPM indicates line slowdown
- Above 650 BPM may indicate sensor errors

**Reject Rate:**
- Target: Below 1.5%
- Warning: 1.5-2%
- Critical: Above 2%

### Industry Concerns

1. **Line Efficiency** - Maximizing bottles per hour per line
2. **Changeover Time** - Switching between product types (flavors, sizes)
3. **Reject Rate** - Minimizing wasted product and packaging

### Raw Counter Fields

Enterprise B uses cumulative counters that EdgeMind must process correctly:
- `countinfeed` - Running total of bottles entering
- `countoutfeed` - Running total of bottles exiting
- `countdefect` - Running total of rejects

These are converted to rates (per hour) for meaningful analysis.

### Waste Metrics and Thresholds

EdgeMind monitors:
- `count_defect`
- `input_countdefect`
- `workorder_quantitydefect`

**Thresholds:**
- Warning: 50 defects/hour
- Critical: 100 defects/hour

### Example MQTT Topics

```
Enterprise B/Site1/filling/filler01/line/metric/countinfeed
Enterprise B/Site3/labeling/labeler01/workstation/metric/countdefect
Enterprise B/Site5/palletizing/palletizer01/workstation/metric/oee
Enterprise B/Site7/packaging/casepacker01/speed/PV
```

---

## Enterprise C: Bioprocessing / Pharma

### Industry Profile

Enterprise C simulates a pharmaceutical bioprocessing facility operating under ISA-88 batch control standards. Unlike continuous manufacturing, bioprocessing runs in discrete batches where contamination, sterility, and regulatory compliance are paramount.

### Batch Control Standard

Enterprise C follows **ISA-88** (S88), the international standard for batch process control. This defines:
- Procedural elements (recipes, phases, operations)
- Physical model (process cells, units, equipment)
- State machines for batch lifecycle

### Equipment Types

| Equipment | Type | Phase | Role |
|-----------|------|-------|------|
| SUM | `single-use-mixer` | Preparation | Prepares media and buffers in disposable containers |
| SUB | `single-use-bioreactor` | Cultivation | Grows cells/organisms in controlled environment |
| CHROM | `chromatography` | Purification | Separates and purifies target molecules |
| TFF | `tangential-flow-filtration` | Filtration | Concentrates and diafilters product |

### Critical Metrics

- **PV_percent** - Process variable as percentage of setpoint
- **phase** - Current batch phase (text)
- **batch_id** - Unique identifier for traceability

### Operating Parameters

**pH Levels:**
- Normal range: 6.8-7.4
- Critical parameter - out-of-range pH can kill cell cultures
- Continuous monitoring required

**Dissolved Oxygen:**
- Normal range: 30-70%
- Below 30% starves cells
- Above 70% may indicate aeration problems

### Industry Concerns

1. **Contamination** - A single contaminated batch is catastrophic
2. **Batch Deviation** - Any parameter excursion must be documented and investigated
3. **Sterility** - Maintaining aseptic conditions throughout the process

### Regulatory Context

Pharmaceutical manufacturing operates under strict regulatory oversight:
- FDA 21 CFR Part 11 (electronic records)
- GMP (Good Manufacturing Practice)
- Batch records must be complete and accurate

### Waste Metrics and Thresholds

EdgeMind monitors:
- `chrom_CHR01_WASTE_PV` - Chromatography waste stream

**Thresholds:**
- Warning: 5 liters
- Critical: 15 liters

Bioprocessing waste thresholds are much lower than other industries because:
1. Materials are expensive (media, buffers)
2. Waste may contain active biological agents
3. Regulatory requirements for waste tracking

### Example MQTT Topics

```
Enterprise C/BioSite1/preparation/SUM01/mixer/PV_percent
Enterprise C/BioSite1/cultivation/SUB01/bioreactor/pH
Enterprise C/BioSite1/purification/CHROM01/column/phase
Enterprise C/BioSite1/filtration/TFF01/filter/pressure
```

---

## How EdgeMind Uses Domain Context

### Automatic Classification

When EdgeMind receives an MQTT message, it classifies the measurement based on naming patterns:

| Pattern | Classification | Example |
|---------|---------------|---------|
| `oee`, `availability`, `performance` | OEE Metric | `line_oee`, `OEE_Performance` |
| `temperature`, `pressure`, `flow` | Sensor Reading | `furnace_temp`, `inlet_pressure` |
| `state`, `status`, `running` | State/Status | `machine_state`, `pump_running` |
| `count`, `total`, `produced` | Counter | `bottles_produced`, `defect_count` |
| `time`, `duration`, `cycle` | Timing | `cycle_time`, `downtime` |

### AI Analysis Context

When Claude analyzes factory data, EdgeMind provides the relevant domain context:

```
Enterprise A is Glass Manufacturing.
Critical concerns: thermal_shock, crown_temperature, refractory_wear
Safe ranges: furnace_temp 2600-2800 F (critical), crown_temp 2400-2600 F
```

This allows Claude to provide industry-relevant insights rather than generic observations.

### Waste Detection

EdgeMind applies enterprise-specific waste thresholds to detect quality issues:

```
Enterprise A (Glass): Warning at 10 defects/hr, Critical at 25 defects/hr
Enterprise B (Beverage): Warning at 50 defects/hr, Critical at 100 defects/hr
Enterprise C (Pharma): Warning at 5 L waste, Critical at 15 L waste
```

These thresholds reflect the different cost structures and quality requirements of each industry.

---

## Summary Comparison

| Aspect | Enterprise A | Enterprise B | Enterprise C |
|--------|--------------|--------------|--------------|
| **Industry** | Glass Manufacturing | Beverage Bottling | Bioprocessing/Pharma |
| **Process Type** | Continuous | High-speed discrete | Batch |
| **Primary Concern** | Temperature control | Line efficiency | Contamination |
| **Critical Metric** | Furnace temp | Bottles per minute | pH level |
| **Waste Unit** | Defects/hour | Defects/hour | Liters |
| **Warning Threshold** | 10 | 50 | 5 |
| **Critical Threshold** | 25 | 100 | 15 |
| **Regulatory Environment** | Standard | Food safety | FDA GMP |

## Related Pages

- [[ProveIt-2026-Overview]] - Conference context and system overview
- [[Live-Demo-Guide]] - Presenter's guide for demonstrations
- [[Quick-Start]] - Setup instructions for local development
