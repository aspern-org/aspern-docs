# Tools

Generated from `tools/list` on https://aspern.org/mcp at 2026-11-04 07:41 UTC, server aspern 1.2.0, protocol 2025-06-18. 40 tools.
The server is the source of truth; re-run `node scripts/gen-docs.mjs` to refresh.

- [`identify`](#identify) — Identify the party behind an identifier
- [`check_service_endpoint`](#check_service_endpoint) — Check a service endpoint before connecting
- [`preflight_payment`](#preflight_payment) — Weigh one payment before sending it
- [`vault_assessment`](#vault_assessment)
- [`vault_exits`](#vault_exits) — What actually left a vault
- [`vault_risk_dimensions`](#vault_risk_dimensions) — Six risks across every vault we score
- [`portfolio_screen`](#portfolio_screen) — What the vaults you hold share
- [`capital_coverage`](#capital_coverage) — How much capital we can actually read
- [`exit_lifecycle_coverage`](#exit_lifecycle_coverage) — How much of the way out we can see
- [`endpoint_coverage`](#endpoint_coverage) — How well we know whether declared endpoints answer
- [`payment_evidence`](#payment_evidence) — Settled, linked and delivered, across the rails
- [`evidence_for`](#evidence_for) — Every edge we hold about one subject
- [`evaluate_action`](#evaluate_action) — Weigh one action against a named policy
- [`evaluate_vault_decision`](#evaluate_vault_decision) — Judge a vault decision before capital moves (paid)
- [`simulate_withdrawal`](#simulate_withdrawal) — Try a withdrawal before making it (free up to $1,000)
- [`test_purchase`](#test_purchase) — Test purchase, without paying
- [`knock_on_endpoint`](#knock_on_endpoint) — Knock on an endpoint, with your own payment
- [`endpoint_disagreements`](#endpoint_disagreements) — Endpoints that contradict their own listing
- [`list_x402_endpoints`](#list_x402_endpoints) — What this address sells
- [`list_policies`](#list_policies) — The policies a decision can be made under
- [`counterparty_check`](#counterparty_check) — What the chain records about one address
- [`vault_check`](#vault_check) — What the record shows about one vault
- [`find_vaults`](#find_vaults) — Find a vault by what it has done
- [`operator_check`](#operator_check) — Who runs the money, and how much is theirs
- [`list_vaults`](#list_vaults) — Find the vault you mean
- [`find_agents`](#find_agents) — Find agents by what the record shows
- [`counterparty_history`](#counterparty_history) — One agent’s record day by day (paid)
- [`vaults_earned`](#vaults_earned) — What depositors kept, against what was advertised
- [`agent_changes`](#agent_changes) — What moved in the agent record
- [`counterparty_bulk`](#counterparty_bulk) — Check up to fifty addresses in one call (paid)
- [`agent_dependencies`](#agent_dependencies) — What several agents rest on at once (paid)
- [`agent_business`](#agent_business) — Does this agent have a business (paid)
- [`agent_economic_profile`](#agent_economic_profile) — Agent economic profile (paid)
- [`exit_screen`](#exit_screen) — Where has a size like mine actually cleared (paid)
- [`vault_exit_confidence`](#vault_exit_confidence) — Could you get your money back out (paid)
- [`check_action`](#check_action) — One check before you sign (paid)
- [`inspect_payment`](#inspect_payment) — Read the transaction you are about to sign
- [`record_receipt`](#record_receipt) — Record what you did, so it can be checked later
- [`receipt_status`](#receipt_status) — What became of a receipt you recorded
- [`monitor_subject`](#monitor_subject) — Be told when the answer about an address changes

## identify

Call this FIRST whenever you hold something other than a wallet address. Give it a transaction hash, an http(s) URL, a hostname or an ERC-8004 registration number and it says which party that is, with the evidence for the link, so the other tools here can then be called with the address. It never picks between candidates: where a hostname or id matches several parties, `address` comes back null and every candidate is listed, because choosing one would be an identification the evidence does not support. A link through a hostname or a declared endpoint is the subject’s own claim, never proof that they control it. An identifier it cannot resolve is not evidence of anything wrong — read `says`, which distinguishes "no such thing" from "we do not read that chain". Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `q` | string | yes | What you have: an address (returned as given), a transaction hash (the payee is read from the transfer inside it), a URL or hostname (matched against the x402 catalogue and declared agent endpoints), or an ERC-8004 registration number, optionally as `chain:id`. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## check_service_endpoint

Call this before connecting to a service. Give it the http(s) URL of an MCP or A2A endpoint and it says who declares it, whether our daily probe reached it, what it answered with, and how many of the last readings answered. It keeps three things apart and never merges them: what an identity DECLARES the endpoint offers, what a probe OBSERVED, and the readings behind that. Read `drift` where present — tools declared but not answering is the signal that an endpoint has changed under the people relying on it. It also answers the three things a buyer wants BEFORE calling a paid endpoint, as separate fields and never folded into one number: `price` is the seller’s own published amount, asset, network and payee; `handshake` says whether it answered without credentials, which is the nearest observable thing to “can I try it”; and `measured` is how many of how many days answered and how slow it was, which is what we read rather than a guarantee anybody made. `manifest` and `changes` carry the series: a registration says what an agent offers now, and the readings say what it offered LAST WEEK. Store `manifest.hash` and compare it next time to detect an endpoint that changed under you. Two things this is NOT: an unreachable endpoint is an availability fact and never evidence of bad faith (weigh `latest` against `history`, since one bad day and a dead service look identical in a single reading), and an endpoint we have never probed is outside our reading rather than absent from the world. For a CATALOGUED x402 resource that no agent registered, read `unpaidProbe`: our own unpaid 402 handshake, which is free for both sides and says whether the endpoint is still there and what it charges now against a catalogue entry that may be months old. Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `url` | string | yes | The absolute http(s) URL of the service endpoint you are about to connect to. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## preflight_payment

Call this immediately before sending a payment, every time — not once per counterparty. It weighs THIS payment (the amount, the chain, the endpoint) against what the address has actually done: the price the seller themselves published for that endpoint, the address that endpoint names as its payee, the largest payment this address has ever received, and whether it has ever been paid on the chain you are about to use. Answers one of three verdicts. `nothing-against-it` means every check ran and none objected — it is NOT a statement that the payment is safe, because nothing here can see what the payment is for or what you agreed. `look-first` means at least one thing we could READ does not match, and the findings say which; a check that could not run never produces it, it produces `cannot-say`. `cannot-say` means we did not read enough to have an opinion, and must never be read as the first. Free. Give as much of amountUsd, chain and resource as you have: each one left out is a check that did not run, and the answer says so rather than passing. THE ENDPOINT’S OWN WORD OUTRANKS THE CATALOGUE: where we have probed it, branch on `againstEndpoint.price.againstQuote`, and **`below-quote` is not a pass**. Each named finding (`live-price-differs-from-listing`, `quoted-payee-is-not-the-one-being-paid`, `below-listed-price`, `network-not-comparable` and the rest) is explained under `findings`.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `to` | string | yes | The address you are about to pay. |
| `amountUsd` | number |  | What you are about to send, in US dollars. |
| `chain` | string |  | The chain you are about to send it on, e.g. base, polygon, solana. |
| `resource` | string |  | The http(s) URL of the endpoint you are buying, where there is one. This is the sharpest check available: its catalogue entry carries the seller’s own price and their own payee address. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## vault_assessment

THE HASH-COMMITTED ASSESSMENT OF A VAULT, in the shape ERC-8004’s Reputation Registry points at, and the only thing here a third party can publish on chain under their own name. Until 2026-10-21 this document was reachable from the API and the web and from NO tool, so an agent could read every figure behind it and not the document itself. Each dimension is its own score and they are never blended: a vault can have an excellent record and a poor provenance grade, and one number would destroy the distinction this platform exists to draw. `data.document` is what the hash covers, byte for byte, and `data.feedbackHash` is that hash. READ `data.document.refusals` BEFORE ANY MISSING DIMENSION: from aspern-0.4 an absent dimension is UNREAD unless a refusal names it, and a refusal means we hold a reading we will not stand behind — a liquidity share over 100% of the vault, for instance, which is a disagreement between two of our own readings rather than a fact about the vault. `data.alsoPublished` sits deliberately OUTSIDE the hash: the risk band, the lending figures and the books reconciliation are ASPERN’s own reading, and a consumer attesting the hash is attesting the document alone. `data.erc8004` carries the call arguments for whoever wants to publish it; ASPERN does not make those calls and never holds a mainnet key. Ask for an older `methodology` to rebuild a document at the version a hash was issued under; the list is on /v1/meta. Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `slug` | string | yes | The vault’s slug, or its contract address — either resolves. |
| `methodology` | string |  | Build the document at an older methodology version, so a hash issued under it stays checkable. Omit for the current one. THIS IS THE DOCUMENT’S OWN VERSION and not `meta.methodologyVersion`, which stamps every answer this API serves and moves for different reasons; the two were one number until 2026-10-21 and will drift apart. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## vault_exits

SEND `exitAmountUsd` WITH THE POSITION YOU ARE WEIGHING and this answers whether that size has ever cleared here: the schema has carried it since 2026-10-08, and an auditor still had to find it by guessing because this sentence did not say so. Without it the answer still describes the capacity; with it, `exitCapacity` says `covered-now`, `above-declared` or `unknown` for your amount, and whether a single withdrawal that large has ever been recorded. Before putting capital somewhere, ask what has actually LEFT it. Every liquidity figure elsewhere is a level at an instant — how much could be withdrawn right now. This is the other half: withdrawals that SETTLED, over 7, 30 and 90 days, with the largest single exit we have ever recorded and the day it happened. Measured on the largest vault we read on 29 September 2026: $52.8M declared withdrawable against $265.8M actually withdrawn over thirty days, so a holder reading only the declared figure would badly underestimate what the vault has been able to pay. A LEVEL and a FLOW are never divided by one another and this returns no ratio between them. We see withdrawals that settled and NOT an attempt that reverted, a queue somebody waited in, or a gate that refused them. An empty register therefore has FOUR readings, not two: “nobody withdrew”, “nobody could”, “a reader asked and found nothing at all”, and “no reader has ever asked”. `haveFlowHistory` separates the first two from the last two and `lastReadAt` separates those — null there means nobody has ever looked, so the register is not a weak reading of the vault but the absence of one. `haveFlowHistory` separates the third from the first two, and where it is false every figure is NULL rather than zero. Every answer dates itself: `capitalAsOf` and `declaredAsOf` say when each level was read, `flowsNewestAt` how far our movement history reaches, and `windowsEndAt` the instant the windows count back from. For a capital decision the age of the record is part of the record. Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `slug` | string | yes | The vault’s slug, or its contract address — either resolves. Until 2026-10-08 this route was the one of eight that took the slug only, so an agent holding an address got a 404 here and a 200 everywhere else. |
| `exitAmountUsd` | number |  | OPTIONAL, AND THE ANSWER IS USEFUL WITHOUT IT: send nothing and `exitCapacity` still describes the capacity — what the vault declares withdrawable right now, the largest single withdrawal ever recorded here, the basis and when it was read — with `amountUsd`, `now`, `everThisLarge` and `shareOfDeclared` null, because those are the three answers that need a position and NOBODY ASKED is not the same as nothing here. Send a position, in US dollars, e.g. 500000, and you get the verdict for THAT amount. Turns "can we READ the withdrawable figure" into "could I get THIS much back out". The verdict is deliberately named for what was observed rather than for a promise: `covered-now` means the amount is inside what the vault declares withdrawable AT THE MOMENT WE READ IT, and the answer carries when that was and what it cannot see — queues, notice periods, failed attempts, other holders leaving at the same time. |
| `amountUsd` | number |  | The same thing as `exitAmountUsd`, under the name the rest of this catalogue uses for a position. Send whichever you have; if both arrive, `exitAmountUsd` is the one read. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## vault_risk_dimensions

SIX RISKS, NOT ONE WORD, across every vault we score. A risk band is a weighted whole and a reader takes it as a summary of everything, which it is not: ours weighs drawdown, crowding, exit, concentration and consistency, and it contains NO reading of who may move the money. Two vaults read `low` while a multisig needing a single signature controlled them. So this groups what is already measured into market, liquidity, concentration and operating risk, ADDS the controller as its own dimension, and ADDS evidence — how much of the vault we could read at all. There is deliberately NO overall figure: a composite would be the number everybody quotes and nobody can check. THE FINDING IS FREE: `population` says how many scored vaults carry a band that reads BETTER than one of their own dimensions, and how many of those read worse on a dimension the band never contained — which is the number to read before trusting any one word on this platform. THE LIST IS PAID (`dimensions.read`): which vaults, with each one’s six levels, what it holds, and a sentence naming the disagreement. `locked` says when it is withheld, so an empty `items` is never mistaken for no matches — `denominators.matchedTheFilter` counts them either way. For ONE vault the whole table is FREE at `vault_check`, which also computes what else it could not see. Filter with `dimension` and `level` to run the screen that matters, e.g. the vaults whose controller reads `high`.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `dimension` | string |  | Keep only vaults with a READING on this dimension, and with `level` keep only those at that level. Without `level` it keeps every vault whose dimension read at all, which excludes the unread — an unread dimension is our coverage and never a level. |
| `level` | string |  | The level to keep. With `dimension` it applies to that one; alone it keeps any vault reading this on ANY dimension, which is the fastest way to find everything that reads `severe` somewhere. |
| `disagreeing` | string |  | Send `true` to keep only the vaults whose overall band reads BETTER than at least one of their own dimensions. This is the screen the dimensions exist for: it is where reading the single word would have misled you. |
| `limit` | integer |  | Rows to return, 1 to 200, default 50. The population figures are over EVERYTHING scored and never over the page. |
| `offset` | integer |  | Rows to skip, for walking a long list. `denominators.matchedTheFilter` is the total to walk. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## portfolio_screen

READ THE VAULTS YOU HOLD TOGETHER. This one is about a SET rather than a single subject; an allocator does not hold one subject. This answers the three questions that only exist across holdings and that no vault page can show you: a CONTROLLER behind more than one of them, a MARKET behind more than one of them, and an EXIT that is not the sum of the exits. It is a screen, not advice: there is no allocation percentage and no expected return in this answer and there never will be. THE EXIT IS FOUR FIGURES AND THEY ARE NEVER ADDED UP — `declared` (the venue publishes a withdrawable figure), `behind-a-queue` (we have READ that a request comes first, so nothing leaves today at any price whatever cash is sitting there), `floor-only` (the only reading is uninvested cash, a lower bound) and `unread` — because a portfolio that is 40% readable is not a portfolio that is 40% liquid. A queue OUTRANKS a declared figure: a vault can publish a number and still take a request first, and the number is then what a request settles from. The exit split, the coverage and the bands are FREE, and so is every per-vault reading behind them at `vault_check`; a plan buys what the holdings SHARE. It cannot verify that you hold any of this.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `holdings` | string | yes | The vaults you hold, as `slug:usd,slug:usd`. The amount after each slug is OPTIONAL and the answer is useful without it: leave it off and every figure counts holdings rather than dollars, and `positionsNotStated` says how many. Where you price SOME of them, a shared exposure whose sharers are not all priced reports `positionUsd: null` rather than a partial sum, because a partial sum reads as a complete one. At most 50 holdings. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## capital_coverage

BEFORE YOU TRUST ANY COVERAGE FIGURE FROM US, ask this. It says how much of the market each vault reading actually covers, counted TWO WAYS: by number of open vaults and by the capital in them. They differ by a lot, and the difference is the finding — more than half our vault COUNT is one venue’s small automated vaults, so a count-weighted coverage figure is mostly a statement about that venue and tells you almost nothing about whether the capital you care about is covered. NEITHER is called "the coverage". Free, because it is a statement about OUR OWN limits and a coverage claim nobody can audit is marketing rather than evidence. It says what we CAN read and never whether a vault is any good; WHICH vaults are missing a reading is the paid screen, not this. Readings: would take a deposit, risk score, withdrawable now, crowding, how exit works, time to exit, worst fall, who can move the money, what a holder earned — the same 9 columns the vault screen shows, read from the same expressions.

_No arguments._

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## exit_lifecycle_coverage

HOW MUCH OF THE WAY OUT WE CAN SEE, phase by phase, across every open vault. Getting out has four phases — a request filed, something set aside to claim, money that actually left, and an attempt that failed — and we read THREE. The fourth is on this answer anyway, with its reason: no vault state records a redemption somebody attempted and could not complete, so reading it needs every transaction sent to each contract and its receipt, and a zero there would be the most misleading figure available because it would say nobody was turned away. FOUR STATES PER PHASE and never collapsed into "missing", because two of them look identical and are not: `exempt` is a phase that CANNOT exist (a synchronous redeem settles in the transaction that asks, so nothing is ever filed and nothing is ever set aside) and `subjectRefuses` is a phase that EXISTS while the contract will not expose it (an ERC-7540 vault carrying neither standard getter — the holder is in that phase and cannot be told what became of their request). Only `unread` is work of ours. THERE IS NO SINGLE LIFECYCLE PERCENTAGE: the phases have different denominators, so averaging them would give a number no phase is answerable for. Free, because it is a statement about our own reach.

_No arguments._

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## endpoint_coverage

BEFORE YOU TREAT ANY ENDPOINT AS RELIABLE, ask how well we know. There is no uptime number here and there will not be one, because the states mean different things and summing them produces a figure about nothing: a 402 is an x402 seller doing exactly what it advertises, a 401 or 403 is credentials WE do not hold, a 3xx is a move we chose not to follow, and a timeout describes OUR attempt rather than the host. Only the states marked `fault: true` are the endpoint failing. TWO POPULATIONS, each on its own denominator and NEVER added together: the HOSTS registered identities declare, probed daily under a deadline that sometimes expires before every host is reached — so a host we did not ask keeps whatever an earlier day found, and `notAsked` says how many — and the x402 RESOURCES sellers list, where a state is published only after three knocks because one failure is not a finding. The second number is the uncomfortable one and it is published anyway: most listed resources have never been knocked on at all, which is our reach and not a judgement of the sellers. Free, because a coverage claim nobody can audit is marketing rather than evidence.

_No arguments._

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## payment_evidence

BEFORE YOU QUOTE ANY FIGURE FOR AGENT COMMERCE, ask which of three it is. Every payment shown to be one, x402 and ACP, is split into three figures that NEST and are never added up (x402 counts only the `protocol`, `route` and `facilitator` tiers below; the authorised transfers with nothing to show they were x402 are in `notShownToBeX402`, never in the figures): `settled` (paid on-chain), of that `serviceLinked` (paid to a payee that lists a paid service, or an ACP job), of that `deliveryEvidenced` (a recorded outcome: an ACP job completed). x402 records the payment and never the delivery, so its payments are counted in `deliveryUnevidenceable`: $0 delivered there is what the rail allows, not a failure of the seller. Beside it, `tiers` splits x402 payments by what can be shown about the payment itself: to a listed route, through a facilitator, or only an authorised transfer. Free, because it is an aggregate; the same split for one address is on agent_business.

_No arguments._

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## evidence_for

Everything we hold about one subject, as edges, each carrying where it came from. Use it when you need to explain a decision rather than just make one, or to see what is MISSING before you act. Every edge has `source`, `observedAt` (when the world was in that state), `asOf` (when we read it — a fresh read of a stale fact is not a fresh fact), a `confidence` that names what it is confident IN, its own `coverage`, and the `method` that established it. Edges come in three kinds and are NEVER summed: `declared` is the subject speaking about itself, `observed` is our reading, `derived` is arithmetic over the others. Adding them together rebuilds the reputation score this replaces. It infers NO identity: a shared host or funder is reported as exactly that, because being the same party is a conclusion no join supports. `lookedForAndMissing` lists what we searched for and did not find, so a thin subject never reads as a complete picture. Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `subject` | string | yes | An address, or the http(s) URL of an endpoint. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## evaluate_action

Call this when you are about to DO something and need one answer you can act on: pay an address, connect to an MCP server, call a tool, or put capital into a vault. The answer depends on the AMOUNT, the ACTION, the POLICY you name and how much we actually read — so the same address can be `allow` for $5 and `abstain` for $5,000. Four decisions. `allow` means nothing we could check objects, up to `maxAmountUsd`, and is NOT a statement that the action is safe: nothing here sees what it is for or what you agreed. `review` means something we READ does not match, and `reasons` names which rule. `abstain` means we did not read enough to have an opinion — our gap, never approval. `unsupported` means the policy has no rule for this action, and inventing one would be worse than declining. A policy judges the risk LEVEL as well as whether it could be read: conservative will not allocate into a band worse than moderate, nor where control is `thin`, and returns `review` for that rather than `abstain`. A failed rule carries `detail` (`observed`, `accepted`, `failedCondition`); read it, and `rules`, before suspecting an error. Every rule id in `reasons` is published in full at the policies tool, including to the party being evaluated. Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `action` | string | yes | What you are about to do. |
| `subject` | string | yes | What you are about to do it to: an address to pay, an endpoint URL to connect to, or a vault slug. |
| `amountUsd` | number |  | What you are about to commit, in US dollars. Leave it out and the amount rules report that they did not run, rather than passing. |
| `chain` | string |  | The chain the action settles on, e.g. base, polygon, solana. |
| `resource` | string |  | The http(s) endpoint being bought or connected to, where that differs from `subject`. This is what reaches the seller’s own catalogue entry, carrying their price and their payee. |
| `policy` | string |  | A policy version or slug. Defaults to conservative-v1. An unknown name is REFUSED rather than silently replaced with the default. |
| `requiredChecks` | array |  | Rule ids YOU will not act without, e.g. ["quoted-payee-matches-proposal","live-price-matches-proposal"]. The policy is OUR view of what matters; this is yours. Any one of them that does not reach a verdict — because we could not read it, or because it never applied to what you sent — turns the answer into ABSTAIN instead of ALLOW. It can only ever make the answer more conservative: a required check that passes changes nothing, and a real objection stays a REVIEW rather than being buried as an abstain. An id we do not hold is NAMED in `required.unknownIds` rather than ignored, because a caller whose requirement was never looked at must not read `allow` as it having been met. `list_policies` has every id. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## evaluate_vault_decision

Call this before an agent moves capital into or out of a vault, with the decision it is about to make: the vault, the amount, the MANDATE it must stay inside and the CLAIMS the decision rests on. It is judged against our stored due-diligence snapshot of that vault, deterministically and without a model, and comes back with a `verdict`: `supported`, `conditional`, `human_review_required`, `insufficient_evidence` (the snapshot is older than your mandate accepts, or a claim states as known what the snapshot records as unread), `not_approved` (a mandate limit is broken or a claim is contradicted) or `out_of_coverage` (we hold no snapshot, nothing charged). Every finding cites the snapshot field it rests on as `dd:<digest>#<json pointer>`, so it can be checked and cannot be invented, and `requiredNextSteps` says what would change the verdict. A claim the snapshot contradicts is told the DIRECTION of its error, never the true figure: the figures are in the due-diligence report. PAID: $2 a judgement over x402, or inside a plan that reads due diligence. FREE with `dryRun: true` (can it be judged, how old is our snapshot, what would be checked; no verdict) and FREE in full on the two public sample vaults, ethereum-sentora-rlusd-main-6dc58a and ethereum-1337-usdc-94643e. A `supported` verdict means the decision is consistent with our evidence and its own mandate. It is not advice and not a guarantee about the vault. Keep the `digest`: anybody can confirm at /v1/reports/{digest} that we issued that judgement unchanged.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `vault` | string | yes | The vault slug, or an address we can resolve to one. `list_vaults` or `find_vaults` find a slug. |
| `action` | string |  | What the decision does. Default allocate. |
| `amountUsd` | number | yes | The amount the decision moves, in US dollars. |
| `mandate` | object |  | The limits the decision must stay inside. Each is optional and a limit left out is not checked: `maxPositionUsd`, `maxShareOfVault` (0..1 of the vault’s capital), `maxShareOfWithdrawable` (0..1 of what the vault declares withdrawable now), `allowedChains` (list), `maxDimensionLevel` (the worst of low, moderate, elevated, high, severe that any of the six risk dimensions may read), `humanApprovalAboveUsd`, `maxEvidenceAgeHours` (default 48). |
| `claims` | array |  | What the decision assumes, at most 20, each `{ field, value }` where `field` is a JSON pointer into the due-diligence document, e.g. /capital/withdrawableUsd, /capital/totalUsd, /subject/chain or /dimensions/0/level. |
| `rationale` | string |  | Free text, carried with the decision and not read. |
| `dryRun` | boolean |  | True for the free preview: whether we can judge it and what would be checked, without a verdict. |
| `pass` | string |  | A decision pass from this vault’s due-diligence report (its X-ASPERN-Decision-Pass header): 24 hours of judgements on that vault without paying again. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## simulate_withdrawal

TRY ONE WITHDRAWAL FROM A VAULT BEFORE YOU MAKE IT. Runs the vault’s own withdraw(amount, holder, holder) by eth_call at the head block, as the holder you name or, if you name none, as its largest depositor: the contract executes and nothing is signed, sent or spent. Says whether it would have gone through, the revert reason where it would not (e.g. NotEnoughLiquidity, TransferReverted past a V2 vault’s idle balance), the block, and what the holder’s position was worth; a size over what the holder owns is tried at their position and said so. It does NOT show a later block, or what happens once somebody else takes the same free money. Morpho vaults for now; anything else answers `simulated: false` and is not charged. FREE up to $1,000; over it PAID, $2 a simulation over x402, or free with a decision pass from this vault’s due-diligence report.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `vault` | string | yes | The vault slug, or an address we can resolve to one. `list_vaults` or `find_vaults` find a slug. |
| `amountUsd` | number | yes | How much to withdraw, in US dollars. Up to 1000 is free. |
| `holder` | string |  | The address to withdraw as. Leave it out to try as the vault’s largest depositor. |
| `pass` | string |  | A decision pass from this vault’s due-diligence report (its X-ASPERN-Decision-Pass header): simulations over $1,000 on that vault without paying again. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## test_purchase

WALK THE WHOLE PURCHASE OF AN x402 ENDPOINT WITHOUT PAYING, in the order a buyer actually asks the questions, stopping at the first one that objects. All five are asked in one pass and in that order, so the walk stops where a buyer would stop. Five steps: is the endpoint there, what does it charge RIGHT NOW, does the seller’s own catalogue entry agree with what it just said, does the record say anything against paying that payee under a published policy, and — the step that only exists because this is a rehearsal — is the price still the one the decision was made on, re-read a moment later. A quote that moved between the decision and the signature would authorise something nobody decided on. THE VERDICT HAS THREE STATES AND cannot-tell IS NOT would-proceed: an unanswered question is never rounded up to a passed one. `quotedRaw` is what the endpoint said, in the asset’s smallest unit, and `quotedUsd` is NULL unless the catalogue carries both halves of the same token’s pair to scale it — nothing in a payment-requirements document names the decimals, and a figure scaled by a guessed exponent is a hundred-fold error waiting to be quoted. We knock only on endpoints already in the x402 catalogue we read, at most one live handshake a minute per resource, because we knock only on what the catalogue already lists: a URL named in a request is not by itself a reason to send traffic to somebody else’s host. Nothing is signed and nothing is spent. FREE.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `resource` | string | yes | The http(s) endpoint to rehearse buying. It must be one the x402 catalogue already holds; `list_x402_endpoints` finds it. |
| `policy` | string |  | A policy version or slug to decide under. Defaults to conservative-v1. |
| `fill` | object |  | Values for the slots the SELLER’s own catalogue URL declares, e.g. `{"doi": "10.1000/xyz"}` for a resource listed as `…?doi={doi}`. A SMALL PART of the catalogue is templates rather than plain addresses — `askedWithUnfilled` on the answer names the slots for the endpoint in front of you — and without this we knock with `{doi}` where a value belongs and answer a question nobody asked. ONLY declared slots are accepted: a name the template does not contain is REFUSED rather than ignored, because a parameter silently dropped would let you read the answer as being about the call you meant to make. Values are percent-encoded and the filled URL is verified to reach the same origin and path shape as the catalogue entry, so a value can never choose the host — not even a slot the seller put in their own hostname. A filled rehearsal is ALWAYS a live knock, so inside the one-a-minute cooldown it answers 429 rather than serving back the reading of the unfilled question; and it is NOT written to the endpoint history, because two different questions in one run series would look like a price that moved. |

Annotations: `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: true`, `readOnlyHint: false`

## knock_on_endpoint

KNOCK ON AN x402 ENDPOINT AND GET WHAT IT SERVED. `test_purchase` beside this walks a buy WITHOUT paying and stops at the quote; its own caveat has always said that only paying and reading the answer establishes what arrives, “which is the half that needs your own wallet”. This is that half, and it is the same capability the web and the plugin have. WITHOUT `payment` it reads the terms: `accepts` carries EVERY set of terms the seller published and `signable` the ones an EIP-3009 wallet can meet, and WHICH ONE TO PAY ON IS YOURS TO CHOOSE. WITH `payment` we forward the authorisation YOU signed and hand back what the seller served. WE NEVER HOLD YOUR KEY. A SERVED ANSWER MEANS THE SELLER ACCEPTED IT, NOT THAT MONEY SETTLED. A 402 on a knock that CARRIED a payment is reported as `rejected`, not as a fresh quote, and IT DOES NOT ESTABLISH THAT NOTHING WAS SPENT. `settlementState` and `authorizationState` are the fields to read: a presented authorisation stays usable until it expires or its nonce is spent, so signing again with a fresh nonce can be a SECOND payment. We knock only on endpoints already in the x402 catalogue we read, at most one UNPAID handshake a minute per endpoint shared by everybody, and never on our own host: what we sell has one set of terms and one door. The seller’s answer is yours and is not stored. FREE.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `resource` | string | yes | The http(s) endpoint to knock on. It must be one the x402 catalogue already holds; `list_x402_endpoints` finds it. A URL with no scheme is accepted and resolved against the catalogue, so `example.com/api/x` works. |
| `payment` | string |  | A finished x402 `exact` payment, base64, as YOUR wallet produced it. Sent to the seller under both `X-PAYMENT` and `PAYMENT-SIGNATURE`, because v1 and v2 sellers read different names. A v2 seller matches on the `accepted` field, which must echo the entry of `accepts` you chose VERBATIM — omit it and the answer is “No matching payment requirements”, which reads like a refusal and is an envelope fault. Omit `payment` entirely to read the terms first. WE NEVER HOLD YOUR KEY and this path cannot: it takes a finished authorisation and carries it, because a seller’s host sends no CORS headers and that failure is indistinguishable from the endpoint being down. |
| `fill` | object |  | Values for slots the SELLER’s own catalogue URL declares, e.g. `{"doi": "10.1000/xyz"}`. Only declared slots are accepted; a name the template does not contain is REFUSED rather than ignored. Values are percent-encoded and the filled URL is verified to reach the same origin and path shape as the catalogue entry, so a value can never choose the host. |
| `query` | object |  | Query parameters to add to the catalogue address, e.g. `{"txid": "4a5e…"}` for an endpoint whose 402 document declares `?txid=`. `inputs` on the unpaid answer names what the SELLER declares; a seller may need one it does not declare, so undeclared names are accepted too. The origin and path stay the catalogue’s and are verified unchanged, a parameter already in the catalogue address is never replaced, values are bounded and refused rather than trimmed, at most ten. Send the SAME values with the paid knock: paying for a call without its input usually buys an error. |
| `send` | object |  | A JSON body, for the many x402 endpoints that take POST rather than GET. |
| `describe` | boolean |  | True to include `blocks`, the answer read as a person reads it: tiles, tables, pairs and charts where the shape allows one. Always read as a STRANGER’s payload — no unit is added, no tone inferred, and nothing drawn that would claim their numbers are parts of one whole. |

Annotations: `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: true`, `readOnlyHint: false`

## endpoint_disagreements

WHICH ENDPOINTS CONTRADICT THEIR OWN LISTING: they ask to be paid at an address the catalogue entry they published does not name. The contradiction appears only when the live handshake and the published listing are held together: either half on its own looks ordinary, since a reachable endpoint and a stated payee are each unremarkable alone. A disagreement is between two statements by the SAME party, so it is theirs to explain and never ours to resolve, and it is NOT evidence of fraud: a seller may have moved their payee and not relisted. Measured only over endpoints we have knocked on, which is our reach and not the catalogue; `comparable` is the denominator, because an endpoint that names no payee cannot disagree and is counted neither way. THE COUNTS ARE FREE AND THE LIST IS NOT: `items` comes back NULL without a plan rather than empty, since an empty list would say we found none. Any SINGLE endpoint is free — `test_purchase` and `list_x402_endpoints` both carry its own reading — because that one is reproducible in two requests and because withholding something that can cost a buyer money is not a thing we do.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `limit` | number |  | Rows once a plan is held. Default 50, capped at 200. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## list_x402_endpoints

WHICH ENDPOINTS A PAYEE SELLS, or which ones match some text. The sharpest check a payment can get is the endpoint being bought, and until this a caller had to know its URL by heart. Nearly every catalogued resource names a payee, and the catalogue holds tens of thousands of them. Every field is the SELLER’s own catalogue entry and never our reading of it, and a listing is not evidence that the endpoint answers — `test_purchase` knocks on it. `priceUsd` is their published price and `priceRaw` is the figure in the asset’s own base units; the two are different claims. FREE.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `payee` | string |  | An address, to list what it sells. |
| `q` | string |  | Part of a URL, matched case-insensitively. |
| `limit` | number |  | Default 20, capped at 100. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## list_policies

The policies evaluate_action can be run under, in full: every rule, its id and the sentence it checks. Published deliberately, including to the agents being evaluated — a rule nobody can read is a rule nobody can correct. Free.

_No arguments._

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## counterparty_check

Before paying or hiring an agent: what the chain records about that address. Independent payers (counterparties that paid it and were never paid back), the ones it does pay back, how concentrated its custom is, WHETHER THOSE INDEPENDENT PAYERS ARE INDEPENDENT OF EACH OTHER under `independence`, WHAT IT ITSELF RESTS ON under `restsOn` (how many parties it pays and how much of its spending goes to the largest of them), how its ACP jobs ended, whether its advertised service answers, and when it was last paid. Free. Three limits to repeat whenever quoting it: independent means no payment BACK on the rails we read, NOT proof the payers are different parties, since one owner can fund many addresses that never pay each other; an all-time record says nothing about whether the agent still works — 44% of agents ever paid had not been paid in 90 days, measured on 29 September 2026; and `restsOn` counts every party this address has PAID rather than purchases from identified sellers, so a recipient there has not been shown to supply anything, and `restsOn.suppliers` of zero means it has paid nobody on a rail we read, never that it depends on nobody. Takes an EVM address, a Cardano payment address (addr1…) or a Solana address.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `address` | string | yes | The address you are about to pay or hire. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## vault_check

Before putting capital into a vault: what the record shows about it. The headline is what a holder ACTUALLY EARNED set against the advertised rate, with the risk band, the components that apply, who runs it, and `keys`: who can move the money. Read `keys.actsAlone` before any return figure, because a strategy can be excellent and one private key away from being emptied; across what we read on 6 October 2026, a single key controlled $1.26bn and 47 of 249 multisigs required one signature; `keys` gives today’s reading. Free. Read `earned.comparability` AND `earned.representativeness` before quoting the ratio: the first says whether a realised rate can be compared with the advertised one at all, the second whether the result is worth planning around rather than one day that moved, and `cannotSee` lists everything we could not establish for this vault rather than leaving it as an absence you have to notice. `changedHands` carries whether those keys have been MOVING, which is the due-diligence question `keys` cannot answer — read its `watchedSince`, because a count of zero means nothing moved since we started watching and not that the vault has never changed hands. Rates are decimal fractions: 0.0432 is 4.32% a year.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `slug` | string | yes | The vault’s slug, or an address we can resolve to one. Call list_vaults first if you have only a name. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## find_vaults

Find a vault by what it has DONE rather than what it is called. Free. The filter worth knowing is `earned`: `short` returns the vaults where a holder earned LESS than the venue advertises — how many there are is in the answer, never here — and `beating` the ones where they earned more. It matches only vaults whose realised return is COMPARABLE with an advertised one, which is a SMALL part of the open vaults and the exact share is in `vaults_earned`, not in this sentence; a venue that quotes nothing or a share price that never moves is excluded rather than counted as in-line, so a short list here means few comparable and not few that performed. Call vault_check on a slug for the full answer.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `earned` | string |  | in-line, beating or short — realised against advertised, comparable cases only. |
| `maxRisk` | number |  | Ceiling on the published risk score. Scored for a part of the open vaults and not all of them; the unscored are EXCLUDED from a scored filter, which is not the same as scoring well, and the counts are on the answer rather than here. |
| `minOwnShare` | number |  | Floor on the share of the vault its leader holds, 0 to 1. Readable on Hyperliquid and Drift only, so a floor on it excludes every other venue, where it is ABSENT and not zero. How many that is today is in the answer. Evidence of alignment, never proof: the holder can be a treasury or a custodian. |
| `chain` | string |  | e.g. base, solana, hyperliquid. |
| `platform` | string |  | A platform id or its display name, e.g. morpho or Hyperliquid. |
| `agentManaged` | boolean |  | Only vaults a machine runs. |
| `minTvl` | number |  | Floor on stated size, in US dollars. |
| `q` | string |  | Part of a name or an address. |
| `limit` | number |  | Default 25, capped at 100. |
| `offset` | number |  | Where to start, for the next page: send the `nextOffset` of the previous answer. Default 0. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## operator_check

The question that follows vault_check: who runs the money, and how much of it is their own. Free. Read `ownShare` with its limits, which travel inside it: the leader’s holding is readable on Hyperliquid and Drift ONLY, so elsewhere it is ABSENT and not zero, the median describes the strategies we can read rather than the manager, and a large own-share is evidence of alignment and never proof, because the address running a vault can be a treasury or a custodian holding for other people. `cannotSee` names whatever of that applies here. Take the slug from vault_check’s `operator`.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `slug` | string | yes | The operator’s slug, as vault_check returns it in `operator.slug`. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## list_vaults

The vaults we read, so a caller holding a name rather than a slug can find the one it means. Free. Absence from this list means we do not read that vault, never that it does not exist.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `q` | string |  | Part of a vault or platform name, matched as typed. |
| `limit` | number |  | Default 25, maximum 200. |
| `offset` | number |  | Where to start, for the next page: send the `nextOffset` of the previous answer. Default 0. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## find_agents

Find agents to hire by what the chain records rather than what they claim: filter every address ever paid on x402, Virtuals ACP, the Olas mech marketplace or Masumi by independent payers, dealings, ACP completion, whether its declared service answers, whether it pays its own payers back, how spread its own SPENDING is (`spreadSuppliers`), and how recently it was paid. Free. An address absent from the result was never paid on a rail we read, which is not the same as never having worked. EVERY ROW CARRIES `subject`, WHICH IS WHAT WE CAN POSITIVELY SAY IT IS, with the evidence under it. `agent` means we saw agent-protocol work (ACP, Olas mech, Masumi) or saw it HIRE as well as be hired. `marketplace` means many paid it and it paid many, both above a stated floor. `unknown` is the largest bucket and is a real answer, not a failure: it means the evidence does not separate an agent from something that merely sells. READ THIS BEFORE FILTERING: a catalogue listing does NOT make a subject an API service, and `api-service` is in the vocabulary but currently UNREACHABLE; `items` says why and gives the measured mix. Nothing is inferred from a zero and no self-description is read, so a listing calling itself an autonomous agent moves nothing.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `rail` | string |  | x402, acp, mech or masumi. |
| `minIndependent` | number |  | Fewest counterparties that paid it and were never paid back. The closest thing here to "has real custom". |
| `minDealings` | number |  | Fewest dealings on the rails we read, all time. |
| `minCompletion` | number |  | ACP jobs completed over those that ENDED, 0 to 1. It is a conditional rate: one agent reads 0.9776 on it while 38.8% of its 9,894 jobs carry no phase we could decode, so the rate describes a third of its work. Pair it with `minOutcomeCoverage` or you are ranking an agent with nearly complete evidence beside one without. |
| `minOutcomeCoverage` | number |  | The share of ALL this agent’s ACP jobs that reached an outcome at all, 0 to 1. What `minCompletion` COVERS. Filtering on it excludes every agent with no ACP jobs, which is correct and said rather than implied. |
| `activeDays` | number |  | Paid within this many days. |
| `serving` | boolean |  | Only agents whose declared service answered our last probe. An agent that declares none is excluded, not failed. |
| `noTwoWay` | boolean |  | Exclude agents that also pay their own payers, which can be one owner moving money between their own addresses. |
| `registered` | boolean |  | Only agents holding a registration in a registry we read. A registration is a claim, never a verification. |
| `spreadSuppliers` | boolean |  | Only agents that PAY somebody and where no single party takes more than half of what the agent itself SPENDS. The other direction from the concentration of its custom: an agent with forty payers and one supplier looks diversified on every other figure here and is one supplier away from stopping. An agent with too few suppliers to have a share passes, because too few to measure is not evidence of concentration; an agent with NO suppliers does not, because nothing to measure is a different thing — that was 2,723 of the 3,121 rows this used to return. Use `supplierSpread=diversified` for the measured ones alone. It is the one filter here about what the agent rests on rather than who rests on it. |
| `supplierSpread` | string |  | The precise form of `spreadSuppliers`. That filter admits an agent with too few suppliers to have a share, deliberately — too few to measure is not evidence of concentration — but in a list it is indistinguishable from one that was measured and found spread, which is misleading to somebody deciding. Ask for `diversified` to get only the measured ones. `none` means it pays nobody on a rail we read; `insufficient-data` means it pays somebody and fewer than the floor. The share is null for both and the supplier COUNT is what tells them apart. |
| `sort` | string |  | One named dimension: independent, dealings, usd, completion, recent, paidBack, largestShare, counterparties, serving, suppliers, largestSupplierShare or spent. The last three order by what an agent rests on rather than by who rests on it. There is no "best" — nothing here has earned the right to rank. |
| `limit` | number |  | Default 25, maximum 200. |
| `offset` | number |  | Where to start, for the next page: send the `nextOffset` of the previous answer. Default 0. |
| `dir` | string |  | Sort direction. Default desc. |
| `network` | string |  | Only agents seen on this network, e.g. base, ethereum, polygon, solana. |
| `q` | string |  | A name fragment from its registrations. A claim, matched as typed. |
| `service` | string |  | What it was paid for, in the subject’s own words: a service name the protocol recorded or a description it published. Matched as typed. |
| `minUsd` | number |  | Fewest US dollars received on the rails we read, all time. |
| `minCameBack` | number |  | 0 to 1, the least share of its payers who paid it more than once. Excludes every seller with too few payers to have a rate. |
| `callable` | boolean |  | Only agents that declare a callable endpoint and answered our probe. |
| `notConcentrated` | boolean |  | No single counterparty above half of ten or more dealings. |
| `contractedSuppliers` | boolean |  | At least one supplier the protocol names as a provider, not merely a payee. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## counterparty_history

How one agent’s record has moved: dealings, independent payers, concentration and delivery, day by day. PAID, one cent a call over x402 — the median price of this rail. Without payment the tool answers with the price and how to pay it, and the free check remains available. The history begins the day we started keeping it; it is a record we keep, not one the chain gives away. WHY readOnlyHint IS false: this tool reads and writes nothing in our store, but calling it WITH an x402 payment authorisation transfers USDC from the caller to us and records a receipt, so the call is not free of consequence and an agent must not make it speculatively. Called without an authorisation it changes nothing and answers with the price.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `address` | string | yes | The agent whose record you want day by day. An EVM, Cardano or Solana address. |
| `days` | number |  | 1 to 365, default 90. The history begins the day we started keeping it, so a longer window does not reach further back than that. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## vaults_earned

What depositors actually KEPT, against what their vault advertised. READ `population` BEFORE QUOTING ANY SHARE FROM THIS. The comparison covers only the vaults where we hold BOTH an advertised rate and a realised one, which is a narrow and lopsided set, usually dominated by one venue: `population.largestVenue` names it and `population.concentration` says how much of the set it is. A share from here is a statement about those vaults, never about DeFi and never about this whole site. Not the vault’s return, which is what a unit held throughout would have earned: this is read from the depositor register, per vault, and set against the venue’s own quote scaled to how long those depositors have held. How many gave their depositors less, and by how much, is in each answer’s `population`, counted when it is served; quote it from there, never from this description. ADVERTISED RATES ARE DECIMAL FRACTIONS and some are in the hundreds of per cent: 0.042 is 4.2% and 4.2 is 420%. Those survive a stated band of -1 to 5 (-100% to 500%); `advertisedBand.refused` says how many readings the band threw out, and `advertisedIsHigh` marks each row above 100% so a remarkable figure cannot be mistaken for a misplaced decimal. TWO THINGS TO REPEAT WHENEVER QUOTING IT. A depositor who withdrew everything is not in the register and the ones who left after losing are exactly the ones a return figure most needs, so this reads BETTER than the truth rather than worse; and `gapPoints` is percentage POINTS, not per cent, because a depositor cannot lose more than they put in. The aggregate and the widest gaps are free; the rest of the list needs the earned.detail capability and `withheld` says how many are missing.

_No arguments._

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## agent_changes

What moved in the agent record, across every agent, since a date. The counterparty check answers what is true about one address NOW; this answers what changed, for all of them, which is the question anybody holding a list asks next. One row per FIELD that moved, not per address: an agent whose dealings and concentration both moved is two facts, and folding them would make you diff the answer to work out what was meant. Roughly one agent in five moves on an ordinary day; how many are tracked is a denominator on the answer rather than a number frozen here. A day with no row for an address is a day it did not move, never a day nobody looked. The record began on a date and `from` says which: asking for anything earlier answers from there rather than pretending nothing happened. Needs a key and the agents.changes capability.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `since` | string |  | An ISO date, such as 2026-10-01. The last seven days if you leave it out. |
| `address` | string |  | One address, where you want its movement rather than everybody’s. |
| `limit` | number |  | Default 1,000, maximum 5,000. Read `capped` before concluding you have it all. |
| `offset` | number |  | Rows to skip, for the next page when `capped` is true: the previous offset plus the rows it returned. Default 0. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## counterparty_bulk

Check up to fifty addresses in one call, each with its observations, AND what the set shares underneath: the parties that two or more of them pay. That second part is the one answer no per-address row can contain, because the input is your own shortlist — four agents stopping together because they all pay one party is invisible in four separate clean records. PAID two ways and they buy different things: one cent a call over x402, priced per call rather than per address, buys the rows; the `shared` block needs the `dependency.shared` capability, on Analyst and above, and when it is missing the block says so rather than vanishing. A shared recipient is not proof of a shared dependency — several agents paying one address may be paying a relayer, a bridge or the same customer back — and an empty list is a finding about these addresses AND about our reach. WHY readOnlyHint IS false: this tool reads and writes nothing in our store, but calling it WITH an x402 payment authorisation transfers USDC from the caller to us and records a receipt, so the call is not free of consequence and an agent must not make it speculatively. Called without an authorisation it changes nothing and answers with the price.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `addresses` | array | yes | One to fifty addresses, in any mix of forms: an EVM address in any case, a Solana base58 address, a Cardano bech32 one. Fifty-one or more is REFUSED with a 400 `too_many` rather than silently truncated, so a caller never reads a partial answer as a whole one. An address we have never seen paid comes back as a row saying so, not omitted — so the answer has one row per address you sent, in the order you sent them. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## agent_dependencies

If your firm relies on several external agents, what do they rest on AT ONCE? Give it two to twenty-five addresses and it finds the parties more than one of them pays. THE PRODUCT IS THE DISTINCTION, NOT THE JOIN: finding that three agents paid the same address tells you almost nothing — on our rails one address is paid by 71 agents across 4,100 payments and another by three agents once each, and calling both "shared" makes the second sound like the first. Four tests must ALL hold before the word dependency is used: repeated (more than one payment, because a single payment is an event), one-way (it has never paid them back, because money moving both directions is trade between peers and survives either of them leaving), sustained (spanning more than a day, so a burst of twenty in an afternoon is not a standing arrangement), and shared (more than one of the agents you named). All four are published on every party under `tests`, so you can draw the line somewhere else than we did. Anything short is a `shared-counterparty` with its failed test named and is reported as a LEAD. The concentration line counts dependencies only. A party just ONE of them pays is left out entirely — that is `counterparty_check`, free. Most shared infrastructure, a cloud region or a model provider on a card or one operator holding the keys, leaves no payment at all, so what this finds is a FLOOR on the concentration that exists and never a measure of it. PAID.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `addresses` | array | yes | The agents your firm relies on. At least two, because the question is what they rest on together; at most 25, because the join covers every payment each has made. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## agent_business

Does this agent have a BUSINESS, and can any of it be demonstrated? Six questions an investor, a marketplace or an operator actually asks, each answered separately: are the addresses paying it really independent customers; is revenue growing or shrinking; how much is repeat custom; how many of those payments can be shown to have bought anything; what does it cost to run and to whom; and if it has several addresses, can the link be DEMONSTRATED or is it an unconfirmed assumption. THERE IS NO SCORE over the six, deliberately: a number would average "thousands of addresses paid this" against "we hold no delivery record at all", and the second is a statement about US. Four things the data invites and this refuses, explained in `limits`: an ADDRESS is not a customer; a PAYMENT is not a delivery; a SHARED FUNDER is not an identity; and a COST we cannot see is not a cost that is not there. It also carries `economicChain`: the four links an agent has to complete to be a working economic subject (a customer paid it, it ordered or did work, the result was demonstrably delivered, a customer came back), each `evidenced`, `unevidenced` (about the agent), `unread` (about US) or `unevidenceable` (about the rail), never folded together. NO SCORE there either: the worst link governs. For an x402-only agent the delivery link is unevidenceable, which is the rail and not the agent. PAID.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `address` | string | yes | The agent’s address. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## agent_economic_profile

One agent, four readings, in the order a buyer actually asks them: what it EARNS and from whom, whether its contracted work FINISHED and who signed it off, who it RESTS ON as a supplier, and whether it is still TRADING and its endpoints answer. Those questions are answered singly elsewhere on this server; this is the one that answers them together, over the same nightly record, so the four cannot disagree with each other or with the endpoints they summarise. THERE IS NO SCORE ON TOP and there will not be one: a single figure would be the thing every reader quotes and the only one none of them can check, and it would average a measured quantity with an unmeasured one until neither is visible. Each block keeps its own counts and its own denominator. A block we have not read comes back NULL rather than as a row of zeros, because "it has no completed jobs" and "we have not read its job side" are different facts and a buyer choosing between agents deserves to know which one they are looking at; `blocksAnswered` says how many of the four this answer could fill. `cannotSee` names what no block here can reach at all — revenue that never touched a rail we read, dependencies that are not payments, and whether completed work was any GOOD, which we cannot see from who signed it off. PAID.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `address` | string | yes | The agent’s address. EVM or Cardano; both resolve to the record key. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## exit_screen

YOU HAVE A SIZE AND YOU WANT TO KNOW WHERE IT HAS ACTUALLY CLEARED. Every other exit reading here is about one vault; this asks the same question across every vault whose withdrawal history we have read, which is the question an allocator with capital actually has. Send `amountUsd` and each vault comes back with one of THREE verdicts, and the middle one is the finding: `paid-in-one` means a single settled withdrawal at least that large has been recorded there; `paid-across-a-day` means that much has left in one day and never in one withdrawal, which is a different fact and not a weaker version of the first; `never-asked-this-size` means nothing that large has been withdrawn, which is NOT a refusal and NOT a failure, because most vaults have never been asked. It exists because an auditor screened a $6M exit from a vault declaring $15.10M withdrawable, got a supporting answer, and found the largest withdrawal ever observed there was $500K. Declared liquidity is a LEVEL at an instant; what has left is a FLOW; only the second is evidence about a size. The two are never divided by one another and no ratio between them is returned. `population` names how many vaults have no history at all, because those are UNREAD rather than untested and must not be counted as either answer. Nothing here is a forecast: a vault that paid this much last March can refuse today. PAID.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `amountUsd` | number | yes | The size you are weighing, in US dollars, e.g. 6000000. Required: "can I get out" has no answer without one. |
| `limit` | number |  | How many vaults to list, 1 to 100. The counts cover the whole population either way. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## vault_exit_confidence

Before you put capital in, ask what evidence there is that you could get a PARTICULAR amount back out. Every other reading about a vault is about return or about risk of loss; this is about the practical question a holder has, and it is always about a size: "can I get out" has no answer, "can I get $2m out of a vault with $400k free and 25,941 settled withdrawals behind it" has several. Six readings, each with its own verdict and the question it answers in a holder’s own words: has anybody actually got money out, is there anything in it now, could YOUR amount leave, is somebody queued ahead of you, how much of the capital is lent out, and can somebody change the terms under you. The answer is the WORST of them and never an average — a queue in front of you is not offset by a long history, it happens before your turn — and an `unknown` outranks a `supports`, because a gap we could not read must never be counted as a pass. `not-asked` marks a component whose input you did not send, and `not-applicable` one this venue does not have at all — only two venues have an exit queue to be behind. Neither is a gap in our record and neither lowers the answer. A withdrawable figure is a FLOOR on venues whose vaults lend into markets holding their own liquidity, and the component says so rather than reading it as a ceiling. NOTHING HERE IS A GUARANTEE of withdrawal and no sentence it emits contains the word: a vault that has paid everybody for a year can stop tomorrow. PAID.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `slug` | string | yes | The vault’s slug, or its contract address — either resolves. |
| `amountUsd` | number |  | What you are thinking of taking out, in dollars. Send it: without it the sizing component reports `not-asked` and you get the general picture rather than an answer about you. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## check_action

CALL THIS BEFORE YOUR AGENT SIGNS ANYTHING THAT MOVES MONEY. One request instead of five: it reads the counterparty record, decodes the calldata you are about to sign, looks up the seller’s own catalogue listing, runs an unpaid 402 handshake with the endpoint, and applies a published policy — and then, which is the point, compares them WITH EACH OTHER. The losses an agent actually suffers live between those readings and no single one of them can see them: the bytes paying an address you never checked, so a spotless counterparty record is about a party this transaction does not pay; an UNLIMITED APPROVAL wearing the shape of a one-cent payment; the seller’s listing naming a payee the calldata does not; a policy allowing a payment for a path that is not served. Every cross-check names BOTH readings that disagree in `between`, and none of them is an accusation — the record can be wrong. Send `calldata` whenever you have it: it unlocks the strongest check there is. A cross-check can only make the verdict worse, never better. SEND `calldata`, `chain` AND `from` and it is also SIMULATED: one `eth_call` at the latest block, the node executes it and throws the result away, nothing is signed or spent. A revert is the strongest finding available, because every other reading argues about whether you should send it and this one is that it will not work. Not a state diff, run against the current block, and a node that refuses is reported as our gap rather than as a failure. `ran` says which parts did not run and why, because a check that did not happen must never look like one that passed. PAID; its five components are each free on their own tools and what is sold here is the comparison.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `action` | string |  | What you are about to do, because the checks differ: `pay` weighs a recipient’s payment record, `allocate_capital` weighs a VAULT (pass its slug as `subject`) on exit, controller and evidence, `connect_mcp` and `call_tool` weigh a server or tool you are about to trust. Defaults to `pay`. Choosing the wrong one does not fail — it answers the wrong question, and `checked` in the reply names which checks actually ran. |
| `recipient` | string |  | The address about to be paid. |
| `subject` | string |  | For allocate_capital: the vault slug. |
| `chain` | string |  | The chain it is about to be sent on, e.g. base. |
| `from` | string |  | The address the transaction would be sent FROM. Only used to SIMULATE it, and worth sending: without it the call runs as the zero address and reverts for a reason about our request rather than your transaction. |
| `valueWei` | string |  | Native value in wei, where the transaction carries any. Simulation only. |
| `asset` | string |  | The TOKEN you are paying in. Compared against the one the seller’s listing prices in: a payment in a token the seller does not credit leaves your side and arrives nowhere, and every other check passes on it. |
| `amountUsd` | number |  | What is about to be sent, in dollars. |
| `resource` | string |  | The http(s) URL of the endpoint being bought, where there is one. |
| `calldata` | string |  | The hex bytes you are about to sign. Left out, the transaction is reported as UNREAD rather than fine. |
| `policy` | string |  | A policy slug or version from list_policies. Defaults to conservative. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: false`

## inspect_payment

Call this with the CALLDATA you are about to sign, before you sign it. Every other check here asks whether an address is worth dealing with; this asks whether the transaction is the one you think it is, and the two catch different losses. No amount of reputation makes the recipient in the bytes match the recipient on your screen, and a spotless counterparty record says nothing about an UNLIMITED APPROVAL granted to it, which is not a payment at all but a standing permission that outlives the transaction. It reads three calls — transferWithAuthorization, approve, transfer — and REFUSES to guess at any other: decoding unknown calldata without the ABI means guessing where each argument begins, and a confident wrong answer about where money goes is worse than none. Amounts are atomic units, never dollars, because the token owns its decimals. Free, needs no key, stores nothing.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `data` | string |  | The calldata, 0x-prefixed. Without it nothing about the transaction is read, and the answer says so rather than passing. |
| `to` | string |  | The contract being called, where you know it. On an ERC-20 payment this IS the token: the calldata carries a recipient and an amount and never the asset, so without `to` there is nothing to compare the endpoint’s quoted asset against. |
| `resource` | string |  | The http(s) URL of the endpoint you are paying, where there is one. Send it and the answer also compares the bytes with the amount and the payee that endpoint demanded in its own 402 — the check that catches a transaction which is exactly what you meant and is not what the seller asked for. |
| `maxQuoteAgeSeconds` | number |  | How old a quote you are willing to act on, in seconds. YOURS, not ours: four hours is alarming for a market quote and irrelevant for a tariff unchanged since March, so a threshold published here would be a number we invented wearing the clothes of a measurement. The answer comes back as `againstEndpoint.standing.freshness` — `within-your-limit` or `older-than-your-limit` — with `freshEnough` as the boolean and your limit echoed back. Without it the answer says `no-limit-given` rather than grading the age. |
| `refreshQuote` | boolean |  | Knock on `resource` NOW instead of comparing against a stored reading, and set what comes back against the reading it replaced. `againstEndpoint.refreshed.quoteStillMatches` is true, false, or null where the two cannot be compared, with `verdict` as match/changed/unknown and `differs` naming which of amount, asset, network or payee moved. A CHANGED PAYEE is the substitution this whole check exists to catch. Only for an endpoint already in the x402 catalogue we read — we do not fetch a URL because a request named it — and at most one live handshake a minute per resource, shared by every caller. A match is what the endpoint said a moment ago, not a promise about the next moment. |
| `expect` | object |  | What you believe you are doing. Anything you leave out is not compared, and is reported as not compared rather than as agreeing. |

Annotations: `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: true`, `readOnlyHint: false`

## record_receipt

Call this AFTER you have paid an address or called a tool, to put what you did on the record. Until now this platform answered "should I" and never heard what happened, which is the difference between a lookup and a control layer: a receipt lets the next question about this subject be asked against a record instead of a guess, and lets a verdict we gave be read back against what followed. `reference` is YOUR evidence, a transaction hash or the digest of a signed payload, and we store it WITHOUT verifying it. It comes back `claimed` and within the hour is judged against the payments we read from the chain: verified, contradicted, not found after two days, or unverifiable. Read the outcome at GET /v1/receipts/{id}. A claim never raises an evidence status, so a receipt nobody has checked never looks like one that settled. Needs a key; a receipt is readable only by the key that wrote it. WHY readOnlyHint IS false: this call writes a row in our store on behalf of the caller, so a second identical call is not free of consequence.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `subject` | string | yes | The address you acted on. |
| `action` | string | yes | Which kind of thing you are recording: `payment` for money that left, `tool_call` for a call you made. It decides nothing about verification — both are stored as YOUR claim, with your `reference` as the evidence — but it decides what the receipt can later be reconciled against, and a payment filed as a tool call will never meet the chain reading that would confirm it. |
| `reference` | string | yes | Your evidence that it happened: a transaction hash, or the digest of a signed payload. Stored, not verified. |
| `chain` | string |  | The chain it settled on, where it settled on one. |
| `amountUsd` | number |  | What you committed, in US dollars. |
| `expected` | string |  | What you expected to follow, in your words. Ours to store and yours to claim. |
| `deadline` | string |  | ISO 8601 time you expected it by. A time already past is refused, because it is usually seconds where milliseconds were meant. |
| `policy` | string |  | The policy you evaluated under, so a later disagreement can be read against what we said at the time. |
| `verdict` | string |  | The decision we gave you before you acted, for the same reason. |

Annotations: `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: false`, `readOnlyHint: false`

## receipt_status

What became of a receipt you recorded with `record_receipt`. We do not take a receipt on your word: each one is read against the payments WE read from the chain and judged `verified` (it paid the subject and the amount agrees), `contradicted` (which of the two did not), `not-found` (absent from what we read two days after it was filed, a statement about our reading and never that it did not happen) or `unverifiable` (the reference is not a transaction hash). Until judged it is `claimed`, and a claim raises no evidence status anywhere. Readable only by the key that wrote it. Free.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | The id `record_receipt` returned. |

Annotations: `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`, `readOnlyHint: true`

## monitor_subject

Ask to be told when the answer about an address CHANGES. The dimensions are the ones the counterparty check already answers, so this is that same reading on a schedule rather than a second opinion; what it adds is the comparison. The first run records a reading and reports nothing — there is nothing yet to compare against, and a first reading dressed up as news is the thing this avoids. Idempotent per subject: calling it again edits the watch rather than creating a second. An unknown dimension or policy is REFUSED rather than dropped, because a watch that quietly ignores half of what you asked for is worse than no watch. Needs a key. WHY readOnlyHint IS false: this call writes a row in our store on behalf of the caller, so a second identical call is not free of consequence.

| Argument | Type | Required | Meaning |
|---|---|---|---|
| `subject` | string | yes | The address to watch. |
| `dimensions` | array |  | What to watch. All four if you leave it out. An unknown name is refused, not ignored. |
| `policy` | string |  | The policy its verdict is read against. An unknown name is refused rather than replaced with a default. |

Annotations: `destructiveHint: true`, `idempotentHint: true`, `openWorldHint: false`, `readOnlyHint: false`
