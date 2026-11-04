#!/usr/bin/env bash
# What the chain records about one address, before you pay it. Free, no key.
# Usage: ./counterparty-check.sh 0xADDRESS
set -euo pipefail
curl -s "https://aspern.org/api/v1/agents/${1:?address}/check"
