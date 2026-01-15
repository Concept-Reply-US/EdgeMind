# Architectural Decisions

This file logs architectural decisions (ADRs) with context and trade-offs.

## Format

- **ADR Number and Title** (YYYY-MM-DD)
- **Context**: Why the decision was needed
- **Decision**: What was chosen
- **Alternatives Considered**: Other options and why rejected
- **Consequences**: Trade-offs (use checkmarks for clarity)

---

## Entries

### ADR-001: Modular Backend Architecture (2025-01)

**Context:**
- `server.js` was growing too large (1000+ lines)
- Hard to maintain, test, and understand
- Need clear separation of concerns

**Decision:**
- Extract into `lib/` modules with focused responsibilities
- Each module handles one concern (config, influx, schema, oee, ai, cmms)
- Clear dependency hierarchy documented in CLAUDE.md

**Alternatives Considered:**
- Single file approach -> Rejected: unmaintainable at scale
- Microservices -> Rejected: overkill for this project, deployment complexity
- Full MVC framework -> Rejected: too much boilerplate for real-time dashboard

**Consequences:**
- Easier to understand and maintain
- Clear module boundaries
- Better testability
- Deployment requires `docker cp` for lib/ folder (not bind-mounted)

---

### ADR-002: InfluxDB for Time-Series Data (2025-01)

**Context:**
- Need to store high-frequency MQTT sensor data
- Require efficient time-range queries for trend analysis
- Need aggregation functions (mean, max, min)

**Decision:**
- Use InfluxDB 2.7 with Flux query language
- Store in `factory` bucket with tags: enterprise, site, area, machine, full_topic

**Alternatives Considered:**
- PostgreSQL with TimescaleDB -> Rejected: more complex setup
- Plain PostgreSQL -> Rejected: inefficient for time-series queries
- Redis -> Rejected: limited query capabilities

**Consequences:**
- Excellent query performance for time ranges
- Built-in aggregation and downsampling
- Flux query language has learning curve
- Docker-based local development

---

### ADR-003: Tier-Based OEE Calculation (2025-01)

**Context:**
- Different factories report OEE data differently
- Some have direct OEE metrics, others have components (availability, performance, quality)
- Some have related metrics that can estimate OEE

**Decision:**
- Implement tier-based OEE system:
  - Tier 1: Direct OEE measurement (highest confidence)
  - Tier 2: Calculated from A/P/Q components
  - Tier 3: Estimated from related metrics
- Return calculation metadata (tier, method, confidence)

**Alternatives Considered:**
- Single calculation method -> Rejected: doesn't work across all enterprises
- Separate endpoints per enterprise -> Rejected: inconsistent API

**Consequences:**
- Works across all factory configurations
- Transparent about data quality (confidence scores)
- More complex implementation
- API returns rich metadata for debugging

---

### ADR-004: ChromaDB for Anomaly Persistence (2026-01-14)

**Context:**
- AI stores detected anomalies only in memory (`factoryState.trendInsights`)
- Anomaly history lost on server restart
- No way to query historical patterns or perform semantic search
- Limited context window for AI deduplication
- AWS AgentCore imminent - need storage strategy aligned with AgentCore Memory patterns

**Decision:**
- Use ChromaDB as vector database for anomaly persistence with RAG capabilities
- Generate embeddings using AWS Bedrock `titan-embed-text-v2` (already available)
- Store anomaly text + embedding on detection
- Retrieve similar anomalies for AI context enrichment

**Alternatives Considered:**
- SQLite -> Rejected: no semantic search, would require separate embedding store
- InfluxDB anomaly storage -> Rejected: not designed for semantic queries
- Hybrid SQLite + RAG -> Rejected: unnecessary complexity, two systems to maintain
- In-memory only (status quo) -> Rejected: loses history on restart, no pattern learning
- Pinecone -> Rejected: external managed service, cost, vendor lock-in

**Rationale (from Quint FPF analysis):**
1. **AgentCore Alignment**: AgentCore Memory uses semantic retrieval - building with vectors now means minimal refactoring when migrating. AgentCore Gateway supports MCP servers, ChromaDB can be exposed as MCP.
2. **Evidence Quality**: Validated with internal testing (CL3) - confirmed Node 22 compatibility, minimal dependencies (only semver)
3. **Embedding Reuse**: AWS Bedrock titan-embed-text-v2 already available - no additional embedding API costs
4. **License**: Apache 2.0 - fully open source, commercial use permitted
5. **Simplicity**: Pure JavaScript client, no native module compilation issues unlike SQLite

**Consequences:**
- ✅ Semantic search for similar anomalies
- ✅ RAG pipeline for AI context enrichment
- ✅ Anomaly history persists across restarts
- ✅ Ready for AWS AgentCore Memory migration
- ⚠️ Adds new dependency and operational component (ChromaDB container)
- ⚠️ Additional storage and memory requirements

**Implementation:**
1. Add `chromadb` dependency to package.json
2. Create `lib/vector/index.js` for ChromaDB client
3. Generate embeddings using Bedrock titan-embed-text-v2
4. Store anomaly text + embedding on detection
5. Retrieve similar anomalies for AI context enrichment

**Revisit:** When AWS AgentCore Memory becomes GA (expected 2026)

---

### ADR-005: Sparkplug B Protocol Support (2025-01)

**Context:**
- Need to support industrial MQTT data from various sources
- Sparkplug B is an industry standard for MQTT in IIoT
- Universal ingestion for different factory configurations

**Decision:**
- Add Sparkplug B decoder for MQTT messages
- Detect protocol automatically based on topic pattern
- Parse Sparkplug B payloads into standard format

**Alternatives Considered:**
- Only plain MQTT -> Rejected: limits factory compatibility
- Custom protocol per factory -> Rejected: not scalable

**Consequences:**
- Wider factory compatibility
- More complex message parsing
- Additional dependency (sparkplug-payload)
- Need to install in container after recreation

<!-- Add new decisions above this line -->
