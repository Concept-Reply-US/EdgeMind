# Contributing to EdgeMind

**INTERNAL USE ONLY - COMPANY PROPRIETARY**

This document outlines the contribution guidelines for internal development on the EdgeMind project.

## Development Setup

### Prerequisites

1. **Node.js 18+** - Required for backend development
2. **Docker** - Required for InfluxDB and containerized deployment
3. **AWS CLI** - Required for Bedrock access (configure with `aws configure`)

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd EdgeMind

# Install dependencies
npm install

# Copy environment template
cp .env.template .env

# Edit .env with your credentials
# Required: MQTT_PASSWORD, AWS credentials
```

### Running Locally

```bash
# Start InfluxDB
docker compose up influxdb -d

# Start development server (with hot reload)
npm run dev

# Or start production server
npm start
```

### Verify Setup

```bash
# Check server health
curl http://localhost:3000/health

# Check MQTT connection (should show mqtt: true)
# Check InfluxDB connection (should show influxdb: true)
```

## Branch Naming Convention

Use descriptive branch names with the following prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/oee-dashboard-v2` |
| `fix/` | Bug fixes | `fix/websocket-reconnection` |
| `refactor/` | Code refactoring | `refactor/influxdb-queries` |
| `docs/` | Documentation updates | `docs/api-endpoints` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |
| `test/` | Test additions | `test/oee-calculation` |

### Examples

```bash
# Create a feature branch
git checkout -b feature/real-time-alerts

# Create a bugfix branch
git checkout -b fix/mqtt-reconnect-loop

# Create a documentation branch
git checkout -b docs/deployment-guide
```

## Commit Message Format

Use clear, descriptive commit messages following this format:

```
<type>: <short summary>

<optional body explaining what and why>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no functional change)
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Maintenance (dependencies, configs)
- `perf:` - Performance improvement

### Examples

```bash
# Good commit messages
git commit -m "feat: Add real-time OEE alerts via WebSocket"
git commit -m "fix: Resolve InfluxDB connection timeout on startup"
git commit -m "refactor: Extract MQTT topic parser to separate module"
git commit -m "docs: Update API endpoint documentation"

# Bad commit messages
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "WIP"
```

## Pull Request Process

### Before Creating a PR

1. **Ensure your branch is up to date**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run the server and verify it works**
   ```bash
   npm start
   # Check http://localhost:3000/health
   ```

3. **Test your changes manually**
   - Verify WebSocket connections work
   - Check InfluxDB data flow
   - Confirm Claude insights generate (if applicable)

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Related Issues
Fixes #123 (if applicable)
```

### Review Process

1. Create PR against `main` branch
2. Request review from at least one team member
3. Address review feedback
4. Squash and merge when approved

## Code Style Guidelines

### JavaScript (Node.js)

- Use `const` and `let`, avoid `var`
- Use async/await over callbacks where possible
- Use descriptive variable and function names
- Add JSDoc comments for public functions

```javascript
// Good
/**
 * Calculates OEE using tiered strategy based on available data.
 * @param {string} enterprise - Enterprise name
 * @param {string|null} site - Optional site filter
 * @returns {Promise<Object>} OEE result with calculation metadata
 */
async function calculateOEEv2(enterprise, site = null) {
  // Implementation
}

// Bad
async function calc(e, s) {
  // Implementation
}
```

### Error Handling

```javascript
// Good - specific error handling with logging
try {
  await writeApi.writePoint(point);
} catch (err) {
  console.error('InfluxDB write error:', err.message);
  factoryState.stats.influxWriteErrors++;
}

// Bad - silent failure
try {
  await writeApi.writePoint(point);
} catch (err) {}
```

### Configuration

- All configuration should come from environment variables
- Use sensible defaults in CONFIG object
- Document all environment variables in README.md

```javascript
// Good
const CONFIG = {
  mqtt: {
    host: process.env.MQTT_HOST || 'mqtt://localhost:1883',
    // ...
  }
};
```

## File Organization

```
EdgeMind/
├── server.js          # Main entry point - keep this file focused
├── *.html             # Frontend files
├── docs/              # Documentation and diagrams
├── .env.template      # Environment template (commit this)
├── .env               # Local environment (DO NOT commit)
└── docker-compose.yml # Container orchestration
```

### Adding New Features

1. For backend changes, modify `server.js` or create new modules
2. For frontend changes, modify the appropriate HTML file
3. Update `CLAUDE.md` if adding new API endpoints or changing architecture
4. Update `README.md` if adding new environment variables

## Testing

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] Server starts without errors (`npm start`)
- [ ] Health endpoint returns `status: online` (`/health`)
- [ ] MQTT connection is established (check logs)
- [ ] InfluxDB writes are working (check `influxWrites` counter)
- [ ] WebSocket connections work (open dashboard in browser)
- [ ] Claude insights generate (if not disabled)

### Testing Specific Features

```bash
# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/trends
curl http://localhost:3000/api/oee/v2?enterprise=ALL
curl http://localhost:3000/api/schema/hierarchy

# Test with insights disabled (faster iteration)
DISABLE_INSIGHTS=true npm start
```

## Deployment

### Docker Build

```bash
# Build the image
docker build -t edgemind:latest .

# Run with Docker Compose
docker compose up -d
```

### Environment-Specific Configuration

- Development: Use `.env` file with local InfluxDB
- Production: Use Docker Compose with environment variables

## Security Guidelines

1. **Never commit secrets** - Use `.env` for local development
2. **Validate input** - Sanitize InfluxDB identifiers to prevent injection
3. **Use non-root users** - Docker containers run as `nodejs` user
4. **Keep dependencies updated** - Run `npm audit` periodically

## Getting Help

- Check [CLAUDE.md](CLAUDE.md) for detailed technical documentation
- Review existing code patterns in `server.js`
- Ask in the team Slack channel

---

**INTERNAL USE ONLY** - This repository contains proprietary code.
