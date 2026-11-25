# Changelog

Dates are UTC. The server's own `serverInfo.version` is authoritative.

## 2026-11-25
- `tools/verify-report.mjs`: the offline report verifier, with the published test vectors, two
  sample report sets (one untouched, one tampered) and a mirror of the key bundle. See
  "How to verify a report" in the README.

## 2026-11-04
- Public documentation repository created.
- An MCP client pointed at the bare domain (`https://aspern.org`) is answered as one: a JSON-RPC
  POST to `/` reaches the same server as `/mcp`.

## 1.2.0
- Registry entry `org.aspern/aspern` with streamable HTTP remote at `https://aspern.org/mcp`.
