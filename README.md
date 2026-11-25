# ASPERN

[![MCP Checkup](https://mcpcheckup.com/badge/aspern/aspern.svg)](https://mcpcheckup.com/check/aspern/aspern)

**What the chain records about an address before you pay it, and whether a payment fits it.**

ASPERN is an independent, read-only evidence service for autonomous agents and the people who
allocate capital to them. It reads public on-chain and venue data and answers two kinds of
question:

- **Before paying or hiring an agent:** who pays this address, whether it pays them back,
  whether it delivers, whether its service answers, when it was last paid.
- **Before depositing into a vault:** what it holds, who controls it, what a withdrawal of a
  given size would actually return, and which readings are missing.

Every figure carries the time it was read and its source. A figure we could not measure is
named as not measured, never shown as zero.

This repository holds the **public documentation**: how to connect, what each tool and
endpoint does, what it costs, and the server's registry entry. The service itself is
hosted; its source code is not published.

- Website: https://aspern.org
- MCP server: `https://aspern.org/mcp` (streamable HTTP)
- REST API: `https://aspern.org/api/v1` · OpenAPI: https://aspern.org/api/v1/openapi.json
- Agent card: https://aspern.org/.well-known/agent-card.json
- Methodology: https://aspern.org/methodology

## Connect

No install. The free tools need no key.

**Claude Code**

```bash
claude mcp add --transport http aspern https://aspern.org/mcp
```

**Claude Desktop / claude.ai:** Settings → Connectors → Add custom connector →
`https://aspern.org/mcp`.

**Cursor** (`.cursor/mcp.json`) and other clients that take a URL:

```json
{
  "mcpServers": {
    "aspern": { "url": "https://aspern.org/mcp" }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "aspern": { "type": "http", "url": "https://aspern.org/mcp" }
  }
}
```

**Raw JSON-RPC:**

```bash
curl -s https://aspern.org/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Examples

In [`examples/`](examples/), each one runnable as is:

- `counterparty-check.sh 0xADDRESS` — the free counterparty record over REST
- `mcp-call.sh <tool> '<json args>'` — any MCP tool over plain JSON-RPC
- `x402-price-discovery.sh 0xADDRESS` — a paid endpoint's `402` answer, which states its price

## Tools

The full list, with each tool's description and input schema as the server returns it, is in
[`docs/tools.md`](docs/tools.md) (generated from `tools/list`, dated; refresh with
`node scripts/gen-docs.mjs`). The agent card is mirrored in [`docs/agent-card.json`](docs/agent-card.json). The server is the
source of truth: if the two differ, the server is right and this file is stale.

## Pricing

Free tools need no key and no payment. Paid calls are priced per call and paid over
[x402](https://www.x402.org/) (USDC); the endpoint answers `402 Payment Required` with the
price and how to pay it, so an agent can discover the price before it pays. Current prices:
https://aspern.org/data and [`docs/pricing.md`](docs/pricing.md) (generated).

## What ASPERN does not do

- It never holds, moves or signs for anyone's funds.
- It does not rank, rate or recommend. A reading describes the record behind a figure; it is
  not a credit rating and not investment advice.
- It does not accept paid placement.

## How to verify a report

Every issued due-diligence report comes as four files: the PDF, its `.readings.json` (the data
behind it), a signed `.manifest.json` and a signed `.pdf-attestation.json`. The offline verifier
[`tools/verify-report.mjs`](tools/verify-report.mjs) checks them with Node 18 or later, no
dependencies and no build. It is the same file served at https://aspern.org/verify-report.mjs.

```bash
# 1. Prove the verifier itself behaves as specified, on the published test vectors
node tools/verify-report.mjs --vectors tools/test-vectors/evidence-test-vectors.json
#    ... every test vector passed.            (exit 0)

# 2. Verify a report folder (the PDF beside its three JSON files)
node tools/verify-report.mjs ./my-report-folder
#    keys are fetched from https://aspern.org/api/v1/evidence-keys

# 3. Fully offline, with a saved key bundle, and the key pinned from a copy obtained another way
node tools/verify-report.mjs ./my-report-folder --keys tools/test-vectors/evidence-keys.json --offline \
  --pin b1e025bb22ebe8835fa9fe8459b08c22ceb57d1e99f6c912a220258ab0e928c8
```

What it checks, each as its own status:

| Status | Meaning |
|---|---|
| `hash_matches` | SHA-256 of the readings file bytes equals the manifest's `dataDigest`; SHA-256 of the PDF equals the attestation's `pdfSha256` |
| `signature_valid_for_key` | Ed25519 over the canonical JSON of the manifest and the attestation, with the key named by `kid` |
| `key_trusted_archived` | the key is archived, not revoked, valid at the signing time, and matches `--pin` if given |
| `report_not_revoked` | the report is not listed as revoked or superseded |
| `origin_established` | `established` only when every signature is valid and the key was pinned independently |
| `data_accuracy` | always `not_independently_verified`: no signature proves the figures are true |

Exit codes: `0` valid, `1` invalid (a check failed), `2` incomplete (files missing), `3` unverified
(the key set could not be had; never reported as valid or invalid).

**Try it on the sample sets.** [`tools/test-vectors/`](tools/test-vectors/) holds two tiny report
sets signed with a **test key whose seed is published** in the vectors (it never signs a real
report), each with its own key set:

```bash
node tools/verify-report.mjs tools/test-vectors/sample-report \
  --keys tools/test-vectors/sample-report/test-keys.json --offline
#    verdict valid, origin_established unverified:key_not_independently_authenticated   (exit 0)

node tools/verify-report.mjs tools/test-vectors/sample-report \
  --keys tools/test-vectors/sample-report/test-keys.json --offline \
  --pin d9b09d71a68ac58876109d707fec399a588af5a8cdcaaa71c7fbb8789de3a7f1
#    verdict valid, origin_established established                                     (exit 0)

node tools/verify-report.mjs tools/test-vectors/sample-report-tampered \
  --keys tools/test-vectors/sample-report-tampered/test-keys.json --offline
#    FAIL  PDF bytes = attestation pdfSha256 ... verdict invalid                        (exit 1)

node tools/verify-report.mjs tools/test-vectors/sample-report --offline
#    signature_unverified:key_unavailable ... verdict unverified                        (exit 3)
```

The real key set, its fingerprints and the revocation list are at
https://aspern.org/api/v1/evidence-keys and https://aspern.org/evidence-keys.json (mirrored in
[`tools/test-vectors/evidence-keys.json`](tools/test-vectors/evidence-keys.json), dated by its
commit; the live endpoint is authoritative). The web version of these checks is https://aspern.org/verify.

## Registry entry

[`server.json`](server.json) is the entry published to the
[official MCP registry](https://registry.modelcontextprotocol.io) as `org.aspern/aspern`.

## Contact and security

- Corrections and questions: see https://aspern.org/support
- Security reports: [`SECURITY.md`](SECURITY.md) and https://aspern.org/.well-known/security.txt

## Licence

The documentation in this repository is licensed under CC BY 4.0. The ASPERN service, its
data and its source code are not covered by this licence; see https://aspern.org/terms.
