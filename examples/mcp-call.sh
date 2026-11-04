#!/usr/bin/env bash
# Call one MCP tool over plain JSON-RPC. Free tools need no key.
# Usage: ./mcp-call.sh counterparty_check '{"address":"0x..."}'
set -euo pipefail
TOOL=${1:?tool name}; ARGS=${2:-'{}'}
curl -s https://aspern.org/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$TOOL\",\"arguments\":$ARGS}}"
