import os
import json
from pathlib import Path
import yaml
import logging
import requests
from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from model.load import load_model
from kb_tools import retrieve

logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "")
MCP_AUTH_MODE = os.environ.get("MCP_AUTH_MODE", "iam")  # "iam" for AWS, "none" for local
EDGEMIND_SERVER_URL = os.environ.get("EDGEMIND_SERVER_URL", "http://localhost:3000")

with open(Path(__file__).parent / "prompt.yaml") as f:
    SYSTEM_PROMPT = yaml.safe_load(f)["system_prompt"]

@app.entrypoint
async def invoke(payload, context):
    tools = [retrieve]
    system_prompt = SYSTEM_PROMPT

    # Connect to MCP gateway
    mcp_error = None
    if MCP_SERVER_URL:
        try:
            from strands.tools.mcp import MCPClient
            if MCP_AUTH_MODE == "iam":
                from mcp_proxy_for_aws.client import aws_iam_streamablehttp_client
                mcp_client = MCPClient(lambda: aws_iam_streamablehttp_client(
                    endpoint=MCP_SERVER_URL,
                    aws_region=os.environ.get("AWS_REGION", "us-east-1"),
                    aws_service="bedrock-agentcore"
                ))
            else:
                from mcp import ClientSession
                from mcp.client.streamable_http import streamablehttp_client
                mcp_client = MCPClient(lambda: streamablehttp_client(url=MCP_SERVER_URL))
            mcp_client.__enter__()
            mcp_tools = mcp_client.list_tools_sync()
            logger.info(f"[MCP] Loaded {len(mcp_tools)} tools from gateway")
            tools = [*mcp_tools, retrieve]
        except Exception as e:
            import traceback
            mcp_error = str(e)
            logger.warning(f"[MCP] Error connecting to gateway: {mcp_error}")
            traceback.print_exc()

    # Handle MCP failure with fallback factory context
    if mcp_error or not MCP_SERVER_URL:
        logger.warning("[MCP] Factory tools unavailable, attempting to fetch fallback context")
        try:
            response = requests.get(f"{EDGEMIND_SERVER_URL}/api/agent/context", timeout=5)
            response.raise_for_status()
            factory_context = response.json()

            # Embed context in system prompt
            context_summary = f"""
## FACTORY DATA AVAILABILITY NOTICE

Live factory tool queries are currently UNAVAILABLE. You have access to pre-fetched factory context below.
When users ask questions, use this static context and inform them that the data may not be real-time.

### Pre-fetched Factory Context:
```json
{json.dumps(factory_context, indent=2)}
```
"""
            system_prompt = system_prompt + context_summary
            logger.info("[Fallback] Successfully fetched factory context from EdgeMind server")
        except Exception as context_error:
            logger.error(f"[Fallback] Failed to fetch factory context: {context_error}")
            # Inject prominent warning into system prompt
            system_prompt = system_prompt + """

## CRITICAL: FACTORY DATA UNAVAILABLE

Factory data tools and context are currently unavailable. When users ask about factory metrics, OEE, equipment status,
or any operational data, you MUST inform them that:

1. Factory data systems are currently unavailable
2. You cannot provide real-time or historical factory information
3. They should check back later or contact system administrators

DO NOT attempt to answer factory-related questions with placeholder or assumed data.
"""

    # Build messages from history
    history = payload.get("messages", [])
    messages = [{"role": m["role"], "content": [{"text": m["content"]}]} for m in history]

    agent = Agent(
        model=load_model(),
        tools=tools,
        system_prompt=system_prompt,
        messages=messages
    )
    
    try:
        stream = agent.stream_async(payload.get("prompt", ""))
        last_tool = None
        async for event in stream:
            # Emit tool use events (deduplicated)
            if "current_tool_use" in event:
                tool_info = event["current_tool_use"]
                tool_name = tool_info.get("name")
                if tool_name and tool_name != last_tool:
                    last_tool = tool_name
                    yield f'{{"type": "tool_use", "name": "{tool_name}"}}'
            # Emit text data
            if "data" in event and isinstance(event["data"], str):
                yield event["data"]
    except Exception as e:
        yield f'{{"type": "error", "message": "{str(e)}"}}'

if __name__ == "__main__":
    app.run()
