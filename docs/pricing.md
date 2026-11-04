# Pricing

Generated at 2026-11-04 07:41 UTC. The authoritative price is the one the endpoint itself answers: a paid call
without payment returns `402 Payment Required` with the amount, asset, network and payee, over
[x402](https://www.x402.org/). Plans and limits: https://aspern.org/data.

## Priced in the agent card

| Skill | Price per call (USD) | REST endpoint |
|---|---|---|
| `identify` | free | `https://aspern.org/api/v1/identify` |
| `preflight_payment` | free | `https://aspern.org/api/v1/preflight` |
| `counterparty_check` | free | `https://aspern.org/api/v1/agents/{address}/check` |
| `find_agents` | free | `https://aspern.org/api/v1/counterparty/agents` |
| `counterparty_history` | $0.01 | `https://aspern.org/api/v1/agents/{address}/history` |
| `counterparty_bulk` | $0.01 | `https://aspern.org/api/v1/counterparty/bulk` |
| `evaluate_vault_decision` | $2 | `https://aspern.org/api/v1/evaluate/vault-decision` |

## MCP tools marked paid

Each says its terms in its own description (see [tools.md](tools.md)). Some free tools carry a part that needs a plan; their descriptions say which.

- `evaluate_vault_decision` — Judge a vault decision before capital moves (paid)
- `simulate_withdrawal` — Try a withdrawal before making it (free up to $1,000)
- `counterparty_history` — One agent’s record day by day (paid)
- `counterparty_bulk` — Check up to fifty addresses in one call (paid)
- `agent_dependencies` — What several agents rest on at once (paid)
- `agent_business` — Does this agent have a business (paid)
- `agent_economic_profile` — Agent economic profile (paid)
- `exit_screen` — Where has a size like mine actually cleared (paid)
- `vault_exit_confidence` — Could you get your money back out (paid)
- `check_action` — One check before you sign (paid)
