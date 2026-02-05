import os
from pathlib import Path
import yaml
from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from model.load import load_model
from kb_tools import retrieve

app = BedrockAgentCoreApp()

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "")
MCP_AUTH_MODE = os.environ.get("MCP_AUTH_MODE", "iam")  # "iam" for AWS, "none" for local

with open(Path(__file__).parent / "prompt.yaml") as f:
    SYSTEM_PROMPT = yaml.safe_load(f)["system_prompt"]

@app.entrypoint
async def invoke(payload, context):
    tools = [retrieve]
    
    # Connect to MCP gateway
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
            tools = [*mcp_client.list_tools_sync(), retrieve]
        except Exception:
            pass  # Fall back to local tools only
    
    # Build messages from history
    history = payload.get("messages", [])
    messages = [{"role": m["role"], "content": [{"text": m["content"]}]} for m in history]
    
    agent = Agent(
        model=load_model(),
        tools=tools,
        system_prompt=SYSTEM_PROMPT,
        messages=messages
    )
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

if __name__ == "__main__":
    app.run()
