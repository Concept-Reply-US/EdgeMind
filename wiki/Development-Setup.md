# Development Setup

Complete guide to setting up EdgeMind for local development.

## Prerequisites

Before starting, ensure you have the following installed:

| Requirement | Version | Verification Command |
|------------|---------|---------------------|
| Node.js | 18.0.0+ | `node --version` |
| npm | 8.0.0+ | `npm --version` |
| Docker | 20.0.0+ | `docker --version` |
| AWS CLI | 2.0+ | `aws --version` |
| Git | 2.30+ | `git --version` |

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd EdgeMind
```

## Step 2: Install Node.js Dependencies

```bash
npm install
```

Expected output:
```
added 150 packages in 15s
```

## Step 3: Start InfluxDB

EdgeMind uses InfluxDB 2.7 for time-series data storage. Start it with Docker:

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

Verify InfluxDB is running:
```bash
curl -s http://localhost:8086/health
```

Expected output:
```json
{"name":"influxdb","message":"ready for queries and writes","status":"pass"}
```

## Step 4: Configure Environment Variables

Copy the template and configure your environment:

```bash
cp .env.template .env
```

Edit `.env` with your credentials:

```bash
# Required: MQTT Credentials (get from ProveIt! team)
MQTT_USERNAME=proveitreadonly
MQTT_PASSWORD=your_mqtt_password

# Required: InfluxDB (match values from Docker command)
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=proveit-factory-token-2026
INFLUXDB_ORG=proveit
INFLUXDB_BUCKET=factory

# Required: AWS Bedrock (configure AWS CLI first)
AWS_REGION=us-east-1
```

### AWS Credentials for Bedrock

Configure AWS CLI with credentials that have Bedrock access:

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

Verify AWS access:
```bash
aws sts get-caller-identity
```

## Step 5: Run in Development Mode

Start the server with hot reload:

```bash
npm run dev
```

Expected output:
```
[nodemon] watching path(s): *.*
[nodemon] starting `node server.js`
Server running on port 3000
WebSocket server ready
MQTT: Connecting to mqtt://virtualfactory.proveit.services:1883
MQTT: Connected
Starting Agentic Trend Analysis Loop...
```

## Step 6: Verify Setup

Test server health:
```bash
curl http://localhost:3000/health
```

Expected output:
```json
{
  "status": "online",
  "mqtt": true,
  "influxdb": true,
  "stats": {
    "messageCount": 0,
    "influxWrites": 0
  }
}
```

Open the dashboard in your browser:
```
http://localhost:3000
```

The "LIVE" indicator should turn green when connected.

## IDE Setup (VS Code)

### Recommended Extensions

Install these extensions for the best development experience:

| Extension | Purpose |
|-----------|---------|
| ESLint | JavaScript linting |
| Prettier | Code formatting |
| REST Client | Test API endpoints |
| Docker | Container management |
| GitLens | Git history and blame |

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "files.eol": "\n",
  "javascript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

## Debugging Tips

### MQTT Connection Issues

**Problem:** Server shows `MQTT: Disconnected` repeatedly

**Solution:**
1. Verify MQTT credentials in `.env`
2. Check network connectivity to `virtualfactory.proveit.services:1883`
3. Ensure firewall allows outbound MQTT traffic

```bash
# Test MQTT connectivity
nc -zv virtualfactory.proveit.services 1883
```

### InfluxDB Write Errors

**Problem:** Logs show `InfluxDB write error`

**Solution:**
1. Verify InfluxDB is running: `docker ps | grep influxdb`
2. Check token matches: compare `.env` with Docker init
3. Verify bucket exists: `http://localhost:8086` (login with admin/proveit2026)

### AWS Bedrock Errors

**Problem:** Trend analysis fails with permission errors

**Solution:**
1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check Bedrock model access in AWS Console
3. Ensure region matches: `us-east-1`

### Disable AI for Testing

To test without AWS Bedrock costs:

```bash
DISABLE_INSIGHTS=true npm run dev
```

This starts the server in data collection mode only.

## Quick Reference Commands

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start development server | `npm run dev` |
| Start production server | `npm start` |
| Check server health | `curl http://localhost:3000/health` |
| View trends API | `curl http://localhost:3000/api/trends` |
| View schema hierarchy | `curl http://localhost:3000/api/schema/hierarchy` |
| Stop InfluxDB | `docker stop influxdb` |
| Start InfluxDB | `docker start influxdb` |
| View InfluxDB logs | `docker logs influxdb` |
| Remove InfluxDB data | `docker rm -f influxdb` |

## Next Steps

- [[Local-Development]] - Day-to-day development workflow
- [[Configuration-Reference]] - All environment variables
- [[Quick-Start]] - Get the demo running fast
