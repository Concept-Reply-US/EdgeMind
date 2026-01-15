# Module Architecture Guidelines

How to add new modules to the EdgeMind `lib/` directory.

## Module Organization

```
lib/
├── config.js           # Foundation: Configuration loading
├── validation.js       # Foundation: Input validation utilities
├── state.js            # Foundation: Shared state objects
├── domain-context.js   # Foundation: Domain knowledge
├── influx/
│   ├── client.js       # Data Layer: InfluxDB client setup
│   └── writer.js       # Data Layer: MQTT to InfluxDB writer
├── schema/
│   └── index.js        # Business Logic: Schema discovery
├── oee/
│   └── index.js        # Business Logic: OEE calculation
├── ai/
│   └── index.js        # Business Logic: Claude AI integration
├── sparkplug/
│   └── decoder.js      # Integration: Sparkplug B protocol
├── cmms-interface.js   # Integration: Generic CMMS interface
└── cmms-maintainx.js   # Integration: MaintainX implementation
```

## Module Categories

### Foundation Modules

No dependencies on other `lib/` modules. Import first.

| Module | Purpose |
|--------|---------|
| `config.js` | Environment configuration |
| `validation.js` | Input sanitization |
| `state.js` | Shared state objects |
| `domain-context.js` | Domain knowledge |

### Data Layer Modules

Depend on foundation modules only.

| Module | Dependencies |
|--------|-------------|
| `influx/client.js` | config |
| `influx/writer.js` | influx/client |

### Business Logic Modules

Depend on foundation and data layer.

| Module | Dependencies |
|--------|-------------|
| `schema/index.js` | influx/client, state, config, validation, domain-context |
| `oee/index.js` | influx/client, state, schema, config, validation |
| `ai/index.js` | influx/client, state, config, domain-context |

### Integration Modules

External service integrations.

| Module | Dependencies |
|--------|-------------|
| `sparkplug/decoder.js` | state |
| `cmms-interface.js` | None (interface definition) |
| `cmms-maintainx.js` | cmms-interface |

## File Structure Template

### Simple Module (Single File)

```javascript
// lib/mymodule.js - Brief description of module purpose

// External dependencies
const axios = require('axios');

// Internal dependencies (foundation first)
const CONFIG = require('./config');
const { validateEnterprise } = require('./validation');
const { factoryState } = require('./state');

// Module constants
const MY_CONSTANT = 42;

/**
 * Brief description of function.
 * @param {string} param - Parameter description
 * @returns {Promise<Object>} Return value description
 */
async function myFunction(param) {
  // Implementation
}

/**
 * Another exported function.
 * @param {Object} data - Input data
 * @returns {boolean} Success status
 */
function anotherFunction(data) {
  // Implementation
}

// Private helper (not exported)
function _privateHelper(value) {
  // Internal use only
}

// Export at end
module.exports = {
  // Constants
  MY_CONSTANT,

  // Functions
  myFunction,
  anotherFunction
};
```

### Complex Module (Directory with index.js)

```
lib/myfeature/
├── index.js        # Public API - exports only what's needed
├── queries.js      # Internal: Database queries
├── calculations.js # Internal: Business logic
└── constants.js    # Internal: Feature constants
```

**index.js** (public API):
```javascript
// lib/myfeature/index.js - Feature description

const { queryData } = require('./queries');
const { calculateResult } = require('./calculations');
const { FEATURE_CONSTANTS } = require('./constants');

/**
 * Main feature function exposed to consumers.
 */
async function featureMain(input) {
  const data = await queryData(input);
  return calculateResult(data);
}

module.exports = {
  featureMain,
  FEATURE_CONSTANTS
};
```

## Dependency Injection Pattern

For modules requiring runtime dependencies (like WebSocket broadcast), use an `init()` function.

```javascript
// lib/ai/index.js

// Runtime dependencies (set via init)
let broadcastFn = null;
let cmmsProviderInstance = null;

/**
 * Initialize the AI module with runtime dependencies.
 * @param {Object} deps - Dependencies object
 * @param {Function} deps.broadcast - WebSocket broadcast function
 * @param {Object} deps.cmms - CMMS provider instance
 */
function init({ broadcast, cmms }) {
  broadcastFn = broadcast;
  cmmsProviderInstance = cmms;
}

async function runTrendAnalysis() {
  // Use broadcastFn if set
  if (broadcastFn) {
    broadcastFn({ type: 'trend_insight', data: insight });
  }
}

module.exports = {
  init,
  runTrendAnalysis
};
```

**Usage in server.js:**
```javascript
const ai = require('./lib/ai');

// After WebSocket setup
ai.init({
  broadcast: (msg) => wss.clients.forEach(c => c.send(JSON.stringify(msg))),
  cmms: cmmsProvider
});

ai.startAgenticLoop();
```

## State Access Patterns

### Read-Only Access

Import and read state directly.

```javascript
const { factoryState, schemaCache } = require('./state');

function getMessageCount() {
  return factoryState.stats.messageCount;
}
```

### Write Access

Modify state objects in place (they are shared references).

```javascript
const { factoryState } = require('./state');

function incrementMessageCount() {
  factoryState.stats.messageCount++;
}

function addInsight(insight) {
  factoryState.trendInsights.push(insight);
  // Keep bounded
  if (factoryState.trendInsights.length > 20) {
    factoryState.trendInsights.shift();
  }
}
```

### Cache Patterns

Use TTL-based caching for expensive operations.

```javascript
const { schemaCache } = require('./state');

async function getHierarchy() {
  // Check cache freshness
  const cacheAge = Date.now() - (schemaCache.lastHierarchyRefresh || 0);

  if (schemaCache.hierarchy && cacheAge < schemaCache.CACHE_TTL_MS) {
    return schemaCache.hierarchy;
  }

  // Cache miss - refresh
  const hierarchy = await buildHierarchy();
  schemaCache.hierarchy = hierarchy;
  schemaCache.lastHierarchyRefresh = Date.now();

  return hierarchy;
}
```

## Export Conventions

### What to Export

Export:
- Public functions that other modules need
- Constants used by consumers
- TypeDefs for documentation

Do not export:
- Private helper functions (prefix with `_`)
- Internal state variables
- Implementation details

### Export Organization

```javascript
module.exports = {
  // Constants first
  VALID_ENTERPRISES,
  MAX_INPUT_LENGTH,

  // Init function (if needed)
  init,

  // Main public functions
  calculateOEEv2,
  getOEEBreakdown,

  // Secondary functions
  discoverOEESchema,

  // Query functions
  queryTrends
};
```

## Adding a New Module: Checklist

1. **Determine category** (foundation, data, business, integration)

2. **Identify dependencies** - Can only depend on modules in same or lower categories

3. **Create file structure**:
   - Simple: `lib/mymodule.js`
   - Complex: `lib/myfeature/index.js`

4. **Write module code**:
   ```javascript
   // Header comment
   // External imports
   // Internal imports (foundation first)
   // Constants
   // Functions with JSDoc
   // Private helpers
   // module.exports
   ```

5. **Add to server.js** (if needed):
   ```javascript
   const myModule = require('./lib/mymodule');
   ```

6. **Document module** - Create `wiki/Module-MyModule.md`

7. **Update sidebar** - Add to `wiki/_Sidebar.md`

## Example: Adding a Notification Module

### Step 1: Create the module

```javascript
// lib/notifications.js - Real-time notification management

const CONFIG = require('./config');
const { factoryState } = require('./state');

// Runtime dependencies
let broadcastFn = null;

/**
 * Initialize notifications with WebSocket broadcast.
 * @param {Object} deps - Dependencies
 * @param {Function} deps.broadcast - Broadcast function
 */
function init({ broadcast }) {
  broadcastFn = broadcast;
}

/**
 * Send a notification to all connected clients.
 * @param {string} type - Notification type (info, warning, error)
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 */
function notify(type, message, data = {}) {
  const notification = {
    id: `notif_${Date.now()}`,
    type,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  // Store in state
  factoryState.notifications = factoryState.notifications || [];
  factoryState.notifications.push(notification);

  // Keep bounded
  if (factoryState.notifications.length > 100) {
    factoryState.notifications.shift();
  }

  // Broadcast to clients
  if (broadcastFn) {
    broadcastFn({ type: 'notification', data: notification });
  }

  return notification;
}

/**
 * Get recent notifications.
 * @param {number} limit - Maximum notifications to return
 * @returns {Array} Recent notifications
 */
function getRecent(limit = 10) {
  const notifications = factoryState.notifications || [];
  return notifications.slice(-limit);
}

module.exports = {
  init,
  notify,
  getRecent
};
```

### Step 2: Integrate in server.js

```javascript
// In server.js
const notifications = require('./lib/notifications');

// After WebSocket setup
notifications.init({
  broadcast: (msg) => broadcast(msg)
});

// Use in routes or handlers
app.post('/api/notify', (req, res) => {
  const { type, message } = req.body;
  const notification = notifications.notify(type, message);
  res.json(notification);
});
```

### Step 3: Document

Create `wiki/Module-Notifications.md` with usage examples.

## Testing Modules

### Manual Testing

```bash
# Start server
npm run dev

# Test module functions via API
curl http://localhost:3000/api/notifications
```

### Testing in Isolation

```javascript
// test-mymodule.js
const myModule = require('./lib/mymodule');

async function test() {
  const result = await myModule.myFunction('test input');
  console.log('Result:', result);
}

test().catch(console.error);
```

Run: `node test-mymodule.js`

## Related Documentation

- [[Code-Style-Guide]] - Code formatting and conventions
- [[Module-Config]] - Configuration module reference
- [[Module-State]] - State management patterns
- [[Contributing]] - Full contribution process
