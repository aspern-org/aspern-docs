// Regenerates docs/tools.md and docs/pricing.md from what the live server answers.
// Usage: node scripts/gen-docs.mjs   (Node 18+, no dependencies)
import { writeFileSync } from 'node:fs'

const MCP = 'https://aspern.org/mcp'

async function rpc(method, params = {}) {
  const res = await fetch(MCP, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const text = await res.text()
  // Streamable HTTP may answer as an event stream; take the data line.
  const json = text.trimStart().startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data:')).slice(5)
  const body = JSON.parse(json)
  if (body.error) throw new Error(`${method}: ${body.error.message}`)
  return body.result
}

const init = await rpc('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'aspern-docs', version: '1' },
})
const { tools } = await rpc('tools/list')
const asOf = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

const schemaRows = (schema) => {
  const props = schema?.properties ?? {}
  const required = new Set(schema?.required ?? [])
  const rows = Object.entries(props).map(
    ([k, v]) => `| \`${k}\` | ${v.type ?? (v.enum ? 'enum' : '')} | ${required.has(k) ? 'yes' : ''} | ${(v.description ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`,
  )
  return rows.length ? ['| Argument | Type | Required | Meaning |', '|---|---|---|---|', ...rows].join('\n') : '_No arguments._'
}

const md = [
  `# Tools`,
  ``,
  `Generated from \`tools/list\` on ${MCP} at ${asOf}, server ${init.serverInfo.name} ${init.serverInfo.version}, protocol ${init.protocolVersion}. ${tools.length} tools.`,
  `The server is the source of truth; re-run \`node scripts/gen-docs.mjs\` to refresh.`,
  ``,
  ...tools.map((t) => `- [\`${t.name}\`](#${t.name.toLowerCase().replace(/[^a-z0-9_-]/g, '')})${t.annotations?.title ? ` — ${t.annotations.title}` : t.title ? ` — ${t.title}` : ''}`),
  ``,
  ...tools.flatMap((t) => [
    `## ${t.name}`,
    ``,
    t.description ?? '',
    ``,
    schemaRows(t.inputSchema),
    ``,
    t.annotations ? `Annotations: ${Object.entries(t.annotations).filter(([k]) => k !== 'title').map(([k, v]) => `\`${k}: ${v}\``).join(', ')}` : '',
    ``,
  ]),
].join('\n')
writeFileSync(new URL('../docs/tools.md', import.meta.url), md)

const card = await (await fetch('https://aspern.org/.well-known/agent-card.json')).json()
writeFileSync(
  new URL('../docs/agent-card.json', import.meta.url),
  JSON.stringify(card, null, 2) + '\n',
)
const titleOf = (t) => t.annotations?.title ?? t.title ?? ''
const paid = tools.filter((t) => /\(paid\)|free up to/i.test(titleOf(t)))
const priced = (card.skills ?? []).filter((s) => typeof s.priceUsd === 'number')
const pricing = [
  `# Pricing`,
  ``,
  `Generated at ${asOf}. The authoritative price is the one the endpoint itself answers: a paid call`,
  `without payment returns \`402 Payment Required\` with the amount, asset, network and payee, over`,
  `[x402](https://www.x402.org/). Plans and limits: https://aspern.org/data.`,
  ``,
  `## Priced in the agent card`,
  ``,
  `| Skill | Price per call (USD) | REST endpoint |`,
  `|---|---|---|`,
  ...priced.map((s) => `| \`${s.id}\` | ${s.priceUsd === 0 ? 'free' : `$${s.priceUsd}`} | \`${s.endpoint}\` |`),
  ``,
  `## MCP tools marked paid`,
  ``,
  `Each says its terms in its own description (see [tools.md](tools.md)). Some free tools carry a part that needs a plan; their descriptions say which.`,
  ``,
  ...paid.map((t) => `- \`${t.name}\`${titleOf(t) ? ` — ${titleOf(t)}` : ''}`),
  ``,
].join('\n')
writeFileSync(new URL('../docs/pricing.md', import.meta.url), pricing)

console.log(`tools.md: ${tools.length} tools; agent-card.json saved (${asOf})`)
