#!/usr/bin/env bash
# Discover the price of a paid call without paying: the endpoint answers
# 402 Payment Required with amount, asset, network and payee (x402).
# Usage: ./x402-price-discovery.sh 0xADDRESS
set -euo pipefail
curl -s -i "https://aspern.org/api/v1/agents/${1:?address}/history" | sed -n '1,40p'
