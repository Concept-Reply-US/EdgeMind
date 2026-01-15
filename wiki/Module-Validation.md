# Module: Validation

**Source:** `lib/validation.js`

Input validation and sanitization utilities focused on security and data integrity for the EdgeMind application.

## Purpose

Provides security-focused validation functions to prevent injection attacks (especially Flux query injection), validate API inputs, and format data consistently across the application.

## Key Exports

### Constants

| Name | Type | Description |
|------|------|-------------|
| `VALID_ENTERPRISES` | `string[]` | Whitelist of valid enterprise names |
| `VALID_WS_MESSAGE_TYPES` | `string[]` | Whitelist of valid WebSocket message types |
| `MAX_INPUT_LENGTH` | `number` | Maximum allowed input string length (1000) |

### Functions

| Name | Signature | Description |
|------|-----------|-------------|
| `sanitizeInfluxIdentifier` | `(identifier: string) => string` | Removes dangerous characters from InfluxDB identifiers |
| `formatDuration` | `(durationMs: number) => string` | Formats milliseconds to human-readable duration |
| `validateEnterprise` | `(enterprise: string) => string\|null` | Validates and sanitizes enterprise parameter |
| `validateSite` | `(site: string) => string\|null` | Validates and sanitizes site parameter |
| `extractMeasurementFromTopic` | `(topic: string) => string\|null` | Extracts measurement name from MQTT topic |

## Constants Detail

### VALID_ENTERPRISES

```javascript
['ALL', 'Enterprise A', 'Enterprise B', 'Enterprise C']
```

Used for whitelist validation of enterprise API parameters. Prevents injection by only allowing known values.

### VALID_WS_MESSAGE_TYPES

```javascript
['get_stats', 'ask_claude', 'update_anomaly_filter']
```

Whitelist of allowed WebSocket message types. Unknown message types are rejected.

## Usage Examples

### Sanitizing InfluxDB Identifiers

```javascript
const { sanitizeInfluxIdentifier } = require('./lib/validation');

// Prevents Flux injection attacks
const userInput = 'enterprise"; DROP MEASUREMENT factory; --';
const safe = sanitizeInfluxIdentifier(userInput);
// Result: 'enterprise; DROP MEASUREMENT factory; --'
// Quotes and backslashes removed
```

### Validating Enterprise Parameter

```javascript
const { validateEnterprise } = require('./lib/validation');

// Valid input (whitelist match)
validateEnterprise('Enterprise A');  // Returns: 'Enterprise A'

// Valid input (default)
validateEnterprise(undefined);       // Returns: 'ALL'

// Invalid input (too long)
validateEnterprise('x'.repeat(2000)); // Returns: null

// Dynamic enterprise (sanitized)
validateEnterprise('Custom Enterprise'); // Returns: 'Custom Enterprise'
```

### Validating Site Parameter

```javascript
const { validateSite } = require('./lib/validation');

// Valid site
validateSite('Dallas Line 1');  // Returns: 'Dallas Line 1'

// No site specified
validateSite(undefined);        // Returns: null

// Injection attempt
validateSite('Site"; malicious'); // Returns: 'Site; malicious'
```

### Formatting Duration

```javascript
const { formatDuration } = require('./lib/validation');

formatDuration(45000);      // '45s'
formatDuration(125000);     // '2m 5s'
formatDuration(3725000);    // '1h 2m'
formatDuration(90061000);   // '1d 1h'
```

### Extracting Measurement from Topic

```javascript
const { extractMeasurementFromTopic } = require('./lib/validation');

// Standard topic structure
extractMeasurementFromTopic('Enterprise A/Site1/area/machine/metric/oee');
// Returns: 'metric_oee'

// Short topic
extractMeasurementFromTopic('sensor/temperature');
// Returns: 'sensor_temperature'
```

## Security Considerations

### Flux Injection Prevention

The `sanitizeInfluxIdentifier` function removes quotes (`"`) and backslashes (`\`) which are used in Flux query injection attacks:

```javascript
// Attack vector
const malicious = 'measurement" |> yield()';

// Sanitized
sanitizeInfluxIdentifier(malicious);
// Result: 'measurement |> yield()' - injection neutralized
```

### Input Length Limits

All validation functions enforce `MAX_INPUT_LENGTH` (1000 characters) to prevent DoS attacks via oversized inputs.

### Whitelist Approach

For known values (enterprises, message types), the module uses whitelist validation rather than blacklist filtering. This is more secure as it only allows explicitly approved values.

## API Endpoint Usage

```javascript
// In Express route handler
app.get('/api/oee/v2', (req, res) => {
  const { validateEnterprise, validateSite } = require('./lib/validation');

  const enterprise = validateEnterprise(req.query.enterprise);
  const site = validateSite(req.query.site);

  if (enterprise === null) {
    return res.status(400).json({ error: 'Invalid enterprise parameter' });
  }

  // Safe to use in InfluxDB query
  const query = `
    from(bucket: "factory")
    |> filter(fn: (r) => r.enterprise == "${enterprise}")
  `;
});
```

## Related Modules

- [[Module-Config]] - Configuration that validation protects
- [[Module-State]] - State objects that store validated data
- [[Module-Domain-Context]] - Domain-specific validation context
- `lib/influx/writer.js` - Uses `extractMeasurementFromTopic`
- `lib/oee/index.js` - Uses enterprise/site validation
