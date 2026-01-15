# Code Style Guide

Coding standards and conventions for EdgeMind development.

## Language

EdgeMind uses **JavaScript (Node.js)** for the backend. We do not use TypeScript.

## General Principles

1. **Readability over cleverness** - Write code that others can understand
2. **Explicit over implicit** - Be clear about what code does
3. **Fail fast** - Validate inputs early, handle errors immediately
4. **Document the why** - Comments explain reasoning, not mechanics

## Variable Declarations

Use `const` by default, `let` when reassignment is needed. Never use `var`.

```javascript
// Good
const CONFIG = require('./config');
const factoryState = { messages: [], stats: {} };
let messageCount = 0;

// Bad
var config = require('./config');
let unchangingValue = 42;  // Should be const
```

## Function Style

### Use async/await

Prefer async/await over callbacks or raw promises.

```javascript
// Good
async function queryTrends() {
  try {
    const results = await queryApi.collectRows(fluxQuery);
    return results;
  } catch (error) {
    console.error('Query failed:', error.message);
    return [];
  }
}

// Bad
function queryTrends() {
  return new Promise((resolve, reject) => {
    queryApi.queryRows(fluxQuery, {
      next(row) { /* ... */ },
      error(err) { reject(err); },
      complete() { resolve(results); }
    });
  });
}
```

### JSDoc Comments

Add JSDoc comments to all exported functions.

```javascript
/**
 * Calculates OEE using tiered strategy based on available data.
 * @param {string} enterprise - Enterprise name (e.g., "Enterprise A")
 * @param {string|null} site - Optional site filter
 * @returns {Promise<Object>} OEE result with calculation metadata
 * @throws {Error} If enterprise parameter is invalid
 */
async function calculateOEEv2(enterprise, site = null) {
  // Implementation
}
```

### Function Naming

Use descriptive names in camelCase.

```javascript
// Good
function validateEnterprise(enterprise) { }
function extractMeasurementFromTopic(topic) { }
function buildDomainContext(trends) { }

// Bad
function validate(e) { }
function extract(t) { }
function build(data) { }
```

## Error Handling

### Always catch and log errors

Never silently swallow errors.

```javascript
// Good - Log and handle appropriately
try {
  await writeApi.writePoint(point);
  factoryState.stats.influxWrites++;
} catch (err) {
  console.error('InfluxDB write error:', err.message);
  factoryState.stats.influxWriteErrors++;
}

// Bad - Silent failure
try {
  await writeApi.writePoint(point);
} catch (err) {
  // Silently ignored
}

// Bad - Only logging, no context
try {
  await writeApi.writePoint(point);
} catch (err) {
  console.log(err);
}
```

### Validate inputs early

Check inputs at function entry.

```javascript
// Good
function validateEnterprise(enterprise) {
  if (!enterprise || typeof enterprise !== 'string') {
    return 'ALL';
  }
  if (enterprise.length > MAX_INPUT_LENGTH) {
    return null;  // Reject oversized input
  }
  // Continue with validation
}

// Bad
function processEnterprise(enterprise) {
  // No validation - might crash later
  return enterprise.toUpperCase();
}
```

## Logging

Use `console.log`, `console.error`, and `console.warn` with context.

```javascript
// Good - Contextual logging
console.log('MQTT: Connected to', CONFIG.mqtt.host);
console.error('InfluxDB write error:', err.message);
console.warn('Schema cache is stale, refreshing...');

// Good - Emoji prefixes for quick scanning
console.log('📊 Running trend analysis...');
console.log('✨ Trend Analysis:', insight.summary);
console.error('❌ Trend analysis error:', error.message);

// Bad - No context
console.log('connected');
console.log(err);
```

## Module Structure

### File Header

Start modules with a comment describing purpose.

```javascript
// lib/validation.js - Input validation & sanitization utilities
// Provides security-focused validation for user inputs.

const VALID_ENTERPRISES = ['ALL', 'Enterprise A', 'Enterprise B', 'Enterprise C'];
```

### Export Pattern

Export at the end of the file.

```javascript
// lib/validation.js

const MAX_INPUT_LENGTH = 1000;

function sanitizeInfluxIdentifier(identifier) {
  // ...
}

function validateEnterprise(enterprise) {
  // ...
}

// Export at end
module.exports = {
  // Constants
  MAX_INPUT_LENGTH,

  // Functions
  sanitizeInfluxIdentifier,
  validateEnterprise
};
```

### Import Pattern

Group imports logically.

```javascript
// External dependencies first
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

// Internal modules second
const CONFIG = require('./config');
const { factoryState, schemaCache } = require('./state');
const { sanitizeInfluxIdentifier } = require('./validation');
```

## Configuration

### Environment variables only

All configuration comes from environment variables.

```javascript
// Good - From environment
const CONFIG = {
  mqtt: {
    host: process.env.MQTT_HOST || 'mqtt://localhost:1883',
    password: process.env.MQTT_PASSWORD || ''
  }
};

// Bad - Hardcoded values
const CONFIG = {
  mqtt: {
    host: 'mqtt://production.example.com:1883',
    password: 'secret123'
  }
};
```

### Sensible defaults

Provide defaults for non-sensitive values.

```javascript
const CONFIG = {
  influxdb: {
    url: process.env.INFLUXDB_URL || 'http://localhost:8086',
    org: process.env.INFLUXDB_ORG || 'proveit',
    bucket: process.env.INFLUXDB_BUCKET || 'factory',
    token: process.env.INFLUXDB_TOKEN || ''  // No default for secrets
  }
};
```

## Git Commit Format

### Message Structure

```
<type>: <short summary>

<optional body explaining what and why>
```

### Types

| Type | Purpose |
|------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code refactoring (no functional change) |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance (dependencies, configs) |
| `perf:` | Performance improvement |

### Examples

```bash
# Good
git commit -m "feat: Add real-time OEE alerts via WebSocket"
git commit -m "fix: Resolve InfluxDB connection timeout on startup"
git commit -m "refactor: Extract MQTT topic parser to separate module"

# Bad
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "WIP"
```

## Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/oee-dashboard-v2` |
| `fix/` | Bug fixes | `fix/websocket-reconnection` |
| `refactor/` | Code refactoring | `refactor/influxdb-queries` |
| `docs/` | Documentation | `docs/api-endpoints` |
| `chore/` | Maintenance | `chore/update-dependencies` |

## Security Guidelines

### Never commit secrets

```bash
# .gitignore
.env
*.pem
credentials.json
```

### Sanitize user inputs

```javascript
// Good - Sanitize before use
const sanitized = sanitizeInfluxIdentifier(userInput);
const query = `from(bucket: "${sanitized}")`;

// Bad - Direct interpolation
const query = `from(bucket: "${userInput}")`;
```

### Use whitelist validation

```javascript
// Good - Whitelist approach
const VALID_ENTERPRISES = ['ALL', 'Enterprise A', 'Enterprise B', 'Enterprise C'];
if (VALID_ENTERPRISES.includes(input)) {
  // Safe to use
}

// Bad - Blacklist approach
if (!input.includes('DROP TABLE')) {
  // Still vulnerable
}
```

## Code Review Checklist

Before submitting code:

- [ ] Uses `const`/`let` appropriately (no `var`)
- [ ] Async functions use `async/await`
- [ ] Errors are caught and logged with context
- [ ] Inputs are validated early
- [ ] JSDoc comments on exported functions
- [ ] No hardcoded secrets or credentials
- [ ] Descriptive variable and function names
- [ ] Exports grouped at end of file

## Related Documentation

- [[Module-Architecture-Guidelines]] - Adding new modules
- [[Contributing]] - Full contribution process
- [[Development-Setup]] - Setting up your environment
