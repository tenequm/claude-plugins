---
name: mpp
description: "Build with MPP (Machine Payments Protocol) - the open protocol for machine-to-machine payments over HTTP 402. Use when developing paid APIs, payment-gated content, AI agent payment flows, MCP tool payments, pay-per-token streaming, or any service using HTTP 402 Payment Required. Covers the mppx TypeScript SDK with Hono/Express/Next.js/Elysia middleware, pympp Python SDK, and mpp Rust SDK. Supports Tempo stablecoins, Stripe cards, Lightning Bitcoin, and custom payment methods. Includes charge (one-time) and session (streaming pay-as-you-go) intents. Make sure to use this skill whenever the user mentions mpp, mppx, machine payments, HTTP 402 payments, Tempo payments, payment channels, pay-per-token, paid API endpoints, or payment-gated services."
metadata:
  version: "0.9.0"
  upstream: "mppx@0.8.15, pympp@0.9.1, mpp@0.11.0, @buildonspark/lightning-mpp-sdk@0.1.4, @stellar/mpp@0.7.1, @solana/mpp@0.7.0, @redotpay/mpp@0.1.2, @defuse-protocol/nearintents-mpp-sdk@0.1.2, mpp-card@0.1.8"
  openclaw:
    homepage: https://github.com/tenequm/skills/tree/main/skills/mpp
    emoji: "💸"
    primaryEnv: MPP_SECRET_KEY
    envVars:
      - name: MNEMONIC
        required: false
        description: BIP-39 mnemonic for client wallet (testnet/regtest only).
      - name: MPP_SECRET_KEY
        required: false
        description: Server-side MPP signing secret (HMAC-binds challenge IDs).
      - name: MPP_REALM
        required: false
        description: Stable realm identifier for mppscan attribution.
      - name: MPPX_RPC_URL
        required: false
        description: Tempo RPC endpoint override for the mppx CLI.
      - name: RPC_URL
        required: false
        description: Generic RPC endpoint override (mppx CLI fallback).
      - name: MPPX_ACCOUNT
        required: false
        description: Default account name for the mppx CLI.
      - name: MPPX_CONFIG
        required: false
        description: Path to the mppx CLI config file.
      - name: STRIPE_SECRET_KEY
        required: false
        description: Stripe API secret key for the Stripe payment method.
      - name: STRIPE_API_KEY
        required: false
        description: Alias for the Stripe API secret key in some examples.
      - name: STRIPE_PROFILE_ID
        required: false
        description: Stripe crypto profile ID for on-chain deposit flows.
      - name: STRIPE_NETWORK_ID
        required: false
        description: Stripe network identifier for SPT settlement.
      - name: PRIVY_APP_ID
        required: false
        description: Privy App ID for Privy server-wallet signers.
      - name: PRIVY_APP_SECRET
        required: false
        description: Privy App Secret for Privy server-wallet signers.
      - name: OPENAI_API_KEY
        required: false
        description: Upstream OpenAI key when gating OpenAI via the payments proxy.
      - name: ANTHROPIC_API_KEY
        required: false
        description: Upstream Anthropic key when gating Anthropic via the payments proxy.
---

# MPP - Machine Payments Protocol

MPP is an open protocol (co-authored by Tempo and Stripe) that standardizes HTTP `402 Payment Required` for machine-to-machine payments. Clients pay in the same HTTP request - no accounts, API keys, or checkout flows needed.

The core protocol spec is submitted to the IETF as the [Payment HTTP Authentication Scheme](https://datatracker.ietf.org/doc/draft-ryan-httpauth-payment/).

## Tempo token addresses

Public Tempo token addresses referenced throughout this skill. Use the placeholder names in code; full addresses are in the [Tempo documentation](https://docs.tempo.xyz).

| Token              | Network  | Placeholder            |
|--------------------|----------|------------------------|
| USDC.e (mainnet)   | mainnet  | `<USDC_TEMPO_MAINNET>` |
| pathUSD (testnet)  | testnet  | `<PATHUSD_TESTNET>`    |

## When to Use

- Building a **paid API** that charges per request
- Adding a **paywall** to endpoints or content
- Enabling **AI agents** to pay for services autonomously
- **MCP tool calls** that require payment
- **Pay-per-token streaming** (LLM inference, content generation)
- **Session-based metered billing** (pay-as-you-go)
- Accepting **stablecoins** (Tempo), **cards** (Stripe), or **Bitcoin** (Lightning) for API access
- Building a **payments proxy** to gate existing APIs (OpenAI, Anthropic, etc.)

## Core Architecture

Three primitives power every MPP payment:

1. **Challenge** - server-issued payment requirement (in `WWW-Authenticate: Payment` header)
2. **Credential** - client-submitted payment proof (in `Authorization: Payment` header)
3. **Receipt** - server confirmation of successful payment (in `Payment-Receipt` header)

```
Client                                          Server
  │  (1) GET /resource                            │
  ├──────────────────────────────────────────────>│
  │         (2) 402 + WWW-Authenticate: Payment   │
  │<──────────────────────────────────────────────┤
  │  (3) Sign payment proof                       │
  │  (4) GET /resource + Authorization: Payment   │
  ├──────────────────────────────────────────────>│
  │         (5) Verify + settle                   │
  │         (6) 200 OK + Payment-Receipt          │
  │<──────────────────────────────────────────────┤
```

## Payment Methods & Intents

MPP is payment-method agnostic. Each method defines its own settlement rail:

| Method | Rail | SDK Package | Status |
|--------|------|-------------|--------|
| [Tempo](https://mpp.dev/payment-methods/tempo) | TIP-20 stablecoins on Tempo chain | `mppx` (built-in) | Production |
| [Stripe](https://mpp.dev/payment-methods/stripe) | Cards/wallets (SPT) + on-chain crypto deposit | `mppx` (built-in) | Production |
| [EVM](https://mpp.dev/payment-methods/evm) | EIP-3009 stablecoin authorizations (x402-exact compatible) | `mppx` (built-in) | Production |
| [Lightning](https://mpp.dev/payment-methods/lightning) | Bitcoin over Lightning Network | `@buildonspark/lightning-mpp-sdk` | Production |
| [Stellar](https://mpp.dev/payment-methods/stellar) | SEP-41 tokens on Stellar, charge + `channel` | `@stellar/mpp` | Production |
| [Solana](https://mpp.dev/payment-methods/solana) | Solana-native charge + session (SOL, SPL, Token-2022) | `@solana/mpp` | Production |
| [Monad](https://mpp.dev/payment-methods/monad) | Monad charge (ERC-3009, settlement modes) | `@monad-crypto/mpp` | Production |
| [NEAR Intents](https://mpp.dev/payment-methods/nearintents) | Cross-chain charge via 1Click deposit addresses | `@defuse-protocol/nearintents-mpp-sdk` | Production |
| [RedotPay](https://mpp.dev/payment-methods/redotpay) | RedotPay balance (`rdt`) or stablecoin proof, charge only | `@redotpay/mpp` | Production |
| [Card](https://mpp.dev/payment-methods/card) | Encrypted network tokens (Visa) | `mpp-card` | Production |
| Custom | Any rail | `Method.from()` + `Method.toClient/toServer` | Extensible |

Stellar's `channel` intent is implemented in `@stellar/mpp` while its wire spec is still being drafted - treat the details as subject to change. NEAR Intents settlement is **not trustless**: it routes through a settlement backend, advertised as `methodDetails.settlementBackend: "near-intents"` so agents can apply per-method risk policy.

| Intent | Pattern | Best For |
|--------|---------|----------|
| **charge** | One-time payment per request | API calls, content access, fixed-price endpoints |
| **session** | Pay-as-you-go over payment channels | LLM streaming, metered billing, high-frequency APIs |
| **subscription** | Recurring access via an authorized key (Tempo) | Plans/tiers where access is separated from per-request billing |

## Quick Start: Server (TypeScript)

```typescript
import { Mppx, tempo } from 'mppx/server'

const mppx = Mppx.create({
  methods: [tempo({
    currency: '<PATHUSD_TESTNET>', // pathUSD testnet
    recipient: '0xYourAddress',
  })],
})

export async function handler(request: Request) {
  const result = await mppx.charge({ amount: '0.01' })(request)
  if (result.status === 402) return result.challenge
  return result.withReceipt(Response.json({ data: '...' }))
}
```

Install: `npm install mppx viem` (mppx 0.8.15 requires `viem >= 2.54.0`).

Validate the finished server end-to-end with `npx mppx validate http://localhost:3000`.

## Quick Start: Client (TypeScript)

```typescript
import { privateKeyToAccount } from 'viem/accounts'
import { Mppx, tempo } from 'mppx/client'

// Polyfills globalThis.fetch to handle 402 automatically
Mppx.create({
  methods: [tempo({ account: privateKeyToAccount('0x...') })],
})

const res = await fetch('https://api.example.com/paid')
// Payment happens transparently when server returns 402
```

To avoid mutating the global, use `Fetch.from()` for a standalone payment-aware fetch, `Fetch.polyfill()` / `Fetch.restore()` to install and remove the global wrapper explicitly, and `Mppx.restore()` to undo an instance's polyfill. In browsers, mppx 0.6.0 changed the default: polyfilled `fetch` only sends `Accept-Payment` to **same-origin** endpoints, so cross-origin paid APIs need `acceptPaymentPolicy` (`'always'` / `{ origins: [...] }`). Client fetch retries incremental challenges up to `maxPaymentRetries` (default 3). See `references/typescript-sdk.md`.

## Quick Start: Server (Python)

```python
from fastapi import FastAPI
from mpp import Credential, Receipt
from mpp.server import Mpp
from mpp.methods.tempo import tempo, ChargeIntent

app = FastAPI()
server = Mpp.create(method=tempo(
    currency="<PATHUSD_TESTNET>",
    recipient="0xYourAddress", intents={"charge": ChargeIntent()},
))

@app.get("/resource")
@server.pay(amount="0.50")
async def get_resource(request, credential: Credential, receipt: Receipt):
    return {"data": "paid content", "payer": credential.source}
```

Install: `pip install "pympp[tempo]"`. See `references/python-sdk.md` for full patterns.

## Quick Start: Server (Rust)

Install: `cargo add mpp --features tempo,server`. See `references/rust-sdk.md` for full patterns.

## Framework Middleware (TypeScript)

Each framework has its own import (`mppx/nextjs`, `mppx/hono`, `mppx/express`, `mppx/elysia`):

```typescript
// Next.js
import { Mppx, tempo } from 'mppx/nextjs'
const mppx = Mppx.create({ methods: [tempo({ currency: '<PATHUSD_TESTNET>', recipient: '0x...' })] })
export const GET = mppx.charge({ amount: '0.1' })(() => Response.json({ data: '...' }))

// Hono
import { Mppx, tempo } from 'mppx/hono'
app.get('/resource', mppx.charge({ amount: '0.1' }), (c) => c.json({ data: '...' }))
```

See `references/typescript-sdk.md` for Express and Elysia examples.

## Sessions: Pay-as-You-Go Streaming

Sessions open a payment channel once, then use off-chain vouchers for each request - no blockchain transaction per request. Sub-100ms latency, near-zero per-request fees.

**Sessions v2 (default since mppx 0.7.0):** `tempo.session()` is the TIP-1034 precompile channel flow. The earlier escrow-contract implementation is **Sessions v1**, still available as the now-deprecated `tempo.sessionLegacy`. A v2-expecting client rejects a v1 session and falls back to the charge path, so a server left on old mppx can silently deny newer clients their working path - keep client and server on matching flows. Two client APIs: `tempo.session({ account, maxDeposit })` registers the method with `Mppx.create()` (transparent 402 handling via `fetch`), while `tempo.session.manager({ account, maxDeposit })` returns a managed client for direct lifecycle control (`.sse()`, `.close()`).

```typescript
// Server - session endpoint with automatic settlement
const mppx = Mppx.create({
  methods: [tempo.session({
    currency: '<PATHUSD_TESTNET>', recipient: '0x...',
    store: Store.redis(redis),
    settlementSchedule: { amount: '1.00', intervalMs: 300_000 },
    bootstrap: true, // let returning clients recover their channel on this route
  })],
})
const result = await mppx.session({ amount: '0.001', unitType: 'token' })(request)
if (result.status === 402) return result.challenge
return result.withReceipt(Response.json({ data: '...' }))
```

**Settlement is not automatic unless you configure it.** A session server verifies and stores vouchers, but nothing converts them to on-chain funds without either a `settlementSchedule` or your own sweep via `tempo.settle()` / `tempo.settleBatch()`. Without one, revenue accrues as unredeemed vouchers and channels stay open holding payer deposits. See `references/sessions.md`.

```typescript
// Server - SSE streaming with per-word billing
export const GET = mppx.session({ amount: '0.001', unitType: 'word' })(
  async () => async function* (stream) {
    for (const word of ['hello', 'world']) {
      await stream.charge()
      yield word
    }
  }
)

// Client - session with auto-managed channel
Mppx.create({ methods: [tempo({ account, maxDeposit: '1' })] })
const res = await fetch('http://localhost:3000/api/resource')
// 1st request: opens channel on-chain; 2nd+: off-chain vouchers
```

**WebSocket transport**: Sessions also support WebSocket streaming via `Ws.serve()`, using typed messages (`mpp: 'authorization'`, `mpp: 'message'`, `mpp: 'payment-close-request'`, etc.) for payment negotiation alongside data delivery. See `references/sessions.md` for the full lifecycle, settlement, SSE patterns, and WebSocket integration.

## Multi-Method Support

Accept Tempo stablecoins, Stripe cards, and Lightning Bitcoin on a single endpoint:

```typescript
const mppx = Mppx.create({
  methods: [
    tempo({ currency: '<PATHUSD_TESTNET>', recipient: '0x...' }),
    stripe.charge({ client: new Stripe(key), networkId: 'profile_...', paymentMethodTypes: ['card'] }),
    spark.charge({ mnemonic: process.env.MNEMONIC! }),
  ],
})
```

Use `Mppx.compose()` to present multiple methods in a single 402 response with per-route pricing. Apply the same branch at the challenge site and the verification site, or the 402 advertises fewer options than the server accepts. See `references/typescript-sdk.md`.

## Payment Links (HTML)

Setting `html: true` on a payment method config renders a browser-friendly payment page when a 402 endpoint is visited in a browser, with theming, multi-method compose tabs, and Solana wallet support. Service workers handle credential submission, then the page reloads with the paid response.

Customize via `mppx/html` exports (`Config`, `Text`, `Theme`). `Html.init(methodName)` returns the page context (`challenge`, `config`, `error`, `formattedAmount`, `label`, `root`, `submit`, `text`, `theme`, `vars`) for building a custom method's payment link.

## Zero-Dollar Auth (Proof Credentials)

Authenticate agent identity without payment. Clients sign an EIP-712 proof over the challenge ID instead of creating a transaction - no gas burned, no funds transferred.

```typescript
// Server - zero-dollar charge, with a store for replay protection
const mppx = Mppx.create({
  methods: [tempo.charge({ currency: '<PATHUSD_TESTNET>', recipient: '0x...', store })],
})
const result = await mppx.charge({ amount: '0' })(request)
```

As of mppx 0.8.0, zero-amount proof credentials are **bound to the payer wallet**: the EIP-712 `Proof` typed-data includes an `account` field and the domain version is `3` (exposed as `tempo.Proof`), so a proof signed for one account no longer verifies against another.

Use cases: identity verification, long-running job polling, paid unlock with free subsequent access, multi-step agent pipelines. See [mpp.dev/advanced/identity](https://mpp.dev/advanced/identity).

## Payments Proxy

Gate existing APIs behind MPP payments:

```typescript
import { openai, Proxy } from 'mppx/proxy'
import { Mppx, tempo } from 'mppx/server'

const mppx = Mppx.create({ methods: [tempo()] })
const proxy = Proxy.create({
  title: 'My API Gateway',
  services: [
    openai({
      apiKey: process.env.OPENAI_API_KEY,
      routes: {
        'POST /v1/chat/completions': mppx.charge({ amount: '0.05' }),
        'GET /v1/models': true, // literal `true` marks a free route
      },
    }),
  ],
})
```

Built-in presets `openai()`, `anthropic()`, `stripe()`, plus `custom()` for any upstream. The proxy exposes `fetch` and `listener` handlers and serves `/discover`, `/discover/all`, `/llms.txt`, and `GET /openapi.json`. Non-proxy servers publish the same discovery document with the `discovery()` helper. See `references/discovery-and-proxy.md`.

## MCP Transport

MCP tool calls can require payment using JSON-RPC error code `-32042` (servers may also issue `-32043`):

```typescript
// Server - import tempo from mppx/server, NOT mppx/tempo
import { McpServer } from 'mppx/mcp/server'
import { tempo } from 'mppx/server'
const server = McpServer.wrap(baseServer, { methods: [tempo.charge({ /* ... */ })], secretKey })

// Client - payment-aware MCP client (import tempo from mppx/client)
import { McpClient } from 'mppx/mcp/client'
import { tempo } from 'mppx/client'
const mcp = McpClient.wrap(client, { methods: [tempo({ account })] })
const result = await mcp.callTool({ name: 'premium_tool', arguments: {} })
```

The MCP subpaths moved to `mppx/mcp/server` and `mppx/mcp/client` in mppx 0.8.0; `mppx/mcp-sdk/*` remain as aliases, and `McpClient.wrap` is the single client-wrap API. MCP-over-HTTP challenges settle in the same payment-aware fetch: `Transport.http()` extracts `-32042` challenges and retries with the credential in MCP metadata. Transports are pluggable via `Transport.from/http/mcp/mcpSdk` on both sides. See `references/transports.md`.

## Privy Server Wallets

Use [Privy](https://docs.privy.io) server wallets as MPP signers for agentic payment flows. `createViemAccount` from `@privy-io/node/viem` (requires `@privy-io/node` >= 0.20.0) returns a viem `Account` that delegates signing to the Privy wallet, so it drops into `tempo({ account })` wherever a local account would go:

```typescript
import { createViemAccount } from '@privy-io/node/viem'
import { Mppx, tempo } from 'mppx/client'

const account = createViemAccount(privy, { walletId, address })
const mppx = Mppx.create({ polyfill: false, methods: [tempo({ account })] })
```

Install: `npm install @privy-io/node mppx viem`. Server-side signing works with **app-owned server wallets**; user-owned embedded wallets require authorization keys or key quorums. See `references/typescript-sdk.md` for the manual `toAccount()` construction and the [Privy agentic wallets docs](https://docs.privy.io/recipes/agent-integrations/agentic-wallets).

## Testing & CLI

```bash
# Create an account (stored in keychain), then fund it on testnet
npx mppx account create
npx mppx account fund --network testnet

# Make a paid request
npx mppx http://localhost:3000/resource

# Parse a challenge without signing it
npx mppx sign --dry-run --challenge '<www-authenticate value>'

# Validate a server implementation end-to-end
npx mppx validate http://localhost:3000
```

The CLI also covers `init`, `sessions` (list/view/close), `discover`, `services`, `mcp add`, and `skills add`. Config comes from `MPPX_CONFIG` or an explicit `--config` - there is no auto-discovery from the working directory. Full reference: `references/cli.md`.

## SDK Packages

| Language | Package | Install |
|----------|---------|---------|
| TypeScript | [`mppx`](https://github.com/wevm/mppx) | `npm install mppx` |
| Python | [`pympp`](https://github.com/tempoxyz/pympp) | `pip install "pympp[tempo]"` |
| Rust | [`mpp`](https://github.com/tempoxyz/mpp-rs) | `cargo add mpp --features tempo,client,server` |
| Ruby | [`mpp-rb`](https://github.com/stripe/mpp-rb) (official, by Stripe) | see repo for gem name |
| Go | [`mpp-go`](https://github.com/tempoxyz/mpp-go) (official, by Tempo) | `go get github.com/tempoxyz/mpp-go` |
| Elixir | [`mpp`](https://github.com/ZenHive/mpp) (community) | [hex.pm/packages/mpp](https://hex.pm/packages/mpp) |
| Swift | [`mpp-swift`](https://github.com/amitach/mpp-swift) (community) | see repo |

Capability notes, checked against SDK source rather than the docs matrices (upstream publishes two that disagree):

- **Session** intent: TypeScript and Rust only.
- **Proof Credentials** (zero-dollar auth): TypeScript, Rust, and Ruby. **Not** pympp - the Python Tempo method implements only `hash` and `transaction` payload types.
- **Stripe, MCP, and event handling**: TypeScript, Python, Rust, Ruby. Not the official `mpp-go`, which ships client/server/charge/fee-sponsorship/proof with net/http, Gin, Echo, and Chi middleware. A separate community Go `mppx` (cp0x) also exists.

Go and Ruby have first-class SDK doc pages at [mpp.dev/sdk/go](https://mpp.dev/sdk/go) and [mpp.dev/sdk/ruby](https://mpp.dev/sdk/ruby).

TypeScript subpath exports (mppx 0.8.15):

- Server: `mppx/server` (generic), `mppx/hono`, `mppx/express`, `mppx/nextjs`, `mppx/elysia`
- Client: `mppx/client`, `mppx/client/node` (Node SQLite session channel store)
- Proxy and discovery: `mppx/proxy`, `mppx/discovery`
- Built-in methods: `mppx/stripe` (+ `/client`, `/server`), `mppx/evm` (+ `/client`, `/server`)
- x402 interop: `mppx/x402`
- MCP: `mppx/mcp/server`, `mppx/mcp/client` (`mppx/mcp-sdk/*` retained as aliases)
- HTML: `mppx/html`; Validation: `mppx/validation`
- CLI: `mppx/cli`, `mppx/cli/plugins`
- SSE utilities: `mppx/tempo` (exports `Session` with `Session.Sse.iterateData`)

Always import `Mppx` and `tempo` from the subpath matching your context. Note: `Mppx` and `tempo` are NOT exported from `mppx/tempo` - that subpath only exports `Session` and `Ws`.

## Key Concepts

- **Challenge/Credential/Receipt**: The three protocol primitives. Challenge IDs are HMAC-SHA256 bound to prevent tampering. See `references/protocol-spec.md`
- **Zero-dollar auth**: `proof` credential type for identity without payment. Amount `'0'` triggers EIP-712 proof signing; add `store` for replay protection
- **Split payments**: One charge across multiple recipients in a single transaction (1-10 splits, per-split memos, `expectedRecipients`). See `references/tempo-method.md`
- **Refunds**: No refund protocol exists. **Charge** refunds out-of-protocol by sending funds back to the payer; **session v2** refunds unclaimed reserved funds by default; v1 refunds by closing the channel
- **Credential lifecycle**: `mppx.validateCredential()` is a non-mutating pre-check; `mppx.broadcastCredential()` settles. `verifyCredential()` combines both and is deprecated
- **Tempo gas model**: **No native gas token**. Fees are paid in stablecoins via `feeToken` or a `setUserToken` default; without one, transactions fail with `gas_limit: 0`. See `references/tempo-method.md`
- **Fee sponsorship**: Server pays gas on behalf of clients, capped by `maxInFlightReservations` / `maxInFlightTotalFee`
- **Relays**: Delegate credential validation and broadcast to Tempo API or a compatible relay via `tempo.charge({ relay })`
- **Push/pull modes**: Client broadcasts the transaction (push) or the server does (pull)
- **Client chain pinning**: `tempo.charge({ expectedChainId })` rejects challenges for the wrong Tempo network
- **Reusable client channels**: pass a `channelStore` to persist and reuse payer session channels across processes
- **x402 interop**: `evm.charge({ x402: { facilitator } })` serves native MPP and x402 "exact" challenges from one route; the client prefers Payment-auth challenges
- **Custom methods**: Implement any payment rail with `Method.from()`. See `references/custom-methods.md`

## Payment Hooks

Attach logging, metrics, or tracing without touching the handler. Register on the object returned by `Mppx.create()`; each registration returns an unsubscribe function.

- **Server** (`mppx/server`): `onChallengeCreated`, `onPaymentSuccess`, `onPaymentFailed`, `onSessionSettlement`, `on('*')`
- **Client** (`mppx/client`): `onChallengeReceived`, `onCredentialCreated`, `onPaymentResponse`, `onPaymentFailed`

Server handlers are awaited inline and sequentially on the request path - keep them fast. All hooks except client `onChallengeReceived` (which may return a credential string to override) are pure observers whose thrown errors are swallowed. Filter by intent with `method.intent` or `challenge.intent`. `onPaymentFailed` is the practical way to see the real error behind an opaque 402. See `references/typescript-sdk.md` and [mpp.dev/advanced/payment-hooks](https://mpp.dev/advanced/payment-hooks).

## Managing Agent Spend

Bound an agent's payment authority with **Tempo access keys** - delegated signing keys with built-in spend controls, their own expiry, and a revocation path.

```typescript
import { Expiry } from 'accounts'
import { numberToHex, parseUnits } from 'viem'
import { Scopes } from 'viem/tempo'

const accessKey = {
  expiry: Expiry.days(7),
  limits: [{ token: usdc, limit: numberToHex(parseUnits('10', 6)), period: 86_400 }], // 10 USDC/day
  scopes: [Scopes.tip20(usdc).transfer({ recipients: [recipientAddress] })],
}
// Authorize via provider.request({ method: 'wallet_connect',
//   params: [{ capabilities: { authorizeAccessKey: accessKey } }] })

Mppx.create({
  methods: [tempo({
    account: provider.getAccount(),
    ...provider.getMppxParameters({ accessKey: accessKeyAddress }),
  })],
})
```

Spend limits are **hex-encoded** - pass `numberToHex(parseUnits(...))`, not a raw bigint. Separate keys per app/tool/deployment keep delegated runtimes isolated. See [mpp.dev/guides/managing-agent-spend](https://mpp.dev/guides/managing-agent-spend) and [Tempo access keys](https://docs.tempo.xyz/guide/use-accounts/authorize-access-keys).

## Production Gotchas

The failure modes that cost the most time. Full detail in `references/production-gotchas.md`:

- **Tempo has no native gas token.** Set `feeToken` or call `setUserToken`, or transactions fail with `gas_limit: 0`. "Fund with ETH" errors mean "fund with the stablecoin fee token"
- **Sessions do not settle themselves.** Configure `settlementSchedule` or run your own `tempo.settle()` sweep, paired with a close policy for idle channels
- **Charge settles before your handler runs.** Use `validateCredential` then `broadcastCredential` when payment should depend on the work succeeding. Challenges expire after 5 minutes by default
- **Never use `Store.memory()` in production.** Lost channel state means deposits stay reserved indefinitely
- **Set `realm` explicitly.** Env vars outrank the per-request hostname, and Kubernetes `HOSTNAME` rotates every deploy, breaking mppscan attribution
- **Session voucher, `close`, and `topUp` credentials are bodyless POSTs**, so a body validator running before `mppx.session()` rejects them with a spurious 400. Clone the request before reading its body, or mppx sees an empty one and returns 402
- **Large 402 headers overflow nginx's 4k default buffer** and surface as 502

## References

| File | Content |
|------|---------|
| `references/protocol-spec.md` | Core protocol: Challenge/Credential/Receipt structure, status codes, error handling, security, caching, extensibility |
| `references/typescript-sdk.md` | mppx TypeScript SDK: server/client/middleware, transports, stores, validation, Privy wallets |
| `references/cli.md` | mppx CLI: requests, `validate`, sign, accounts, sessions, discovery, config, env vars |
| `references/production-gotchas.md` | Field-tested failure modes: gas, settlement, stores, realm, request handling, infrastructure |
| `references/sessions.md` | Sessions: payment channels, vouchers, settlement, SSE/WebSocket streaming, recovery |
| `references/subscriptions.md` | Subscription intent: activation, renewal worker, cancellation, period units |
| `references/tempo-method.md` | Tempo: charge + session, fee sponsorship, relays, push/pull, auto-swap, split payments |
| `references/stripe-method.md` | Stripe: fiat SPT flow, on-chain crypto deposit, server/client config, Elements, metadata |
| `references/discovery-and-proxy.md` | Payments proxy, custom services, discovery documents, registries |
| `references/transports.md` | HTTP, MCP, and WebSocket transport bindings: header/message encoding, comparison |
| `references/python-sdk.md` | pympp Python SDK: `@server.pay` decorator, async client, charge intent |
| `references/rust-sdk.md` | mpp Rust SDK: server/client, feature flags, sessions, reqwest middleware |
| `references/lightning-method.md` | Lightning: charge (BOLT11), session (bearer tokens), Spark SDK |
| `references/custom-methods.md` | Custom payment methods: `Method.from`, `toClient`, `toServer` patterns |

## Official Resources

- Website: [mpp.dev](https://mpp.dev) - LLM docs: [llms-full.txt](https://mpp.dev/llms-full.txt) - Spec: [paymentauth.org](https://paymentauth.org)
- GitHub: [wevm/mppx](https://github.com/wevm/mppx) (TypeScript SDK), [tempoxyz/mpp](https://github.com/tempoxyz/mpp) (docs), [tempoxyz/mpp-specs](https://github.com/tempoxyz/mpp-specs) (spec)
- IETF draft: [draft-ryan-httpauth-payment-01](https://datatracker.ietf.org/doc/draft-ryan-httpauth-payment/) (Standards Track; expires 2026-09-19)
- [Stripe MPP docs](https://docs.stripe.com/payments/machine/mpp) - [Tempo docs](https://docs.tempo.xyz) - [x402 interop](https://mpp.dev/guides/use-mpp-with-x402) - [mpp vs x402](https://mpp.dev/mpp-vs-x402) - [governance](https://mpp.dev/governance)
- Agent wallets: [mpp.dev/tools/wallet](https://mpp.dev/tools/wallet) covers Tempo Wallet, Privy Agent CLI, AgentCash, Link CLI, Kite Passport, and the mppx CLI
- Partner integrations: [Cloudflare Agents](https://mpp.dev/partner-integrations/cloudflare-agents), [Vercel AI SDK](https://mpp.dev/partner-integrations/vercel-ai-sdk), [MCP SDK](https://mpp.dev/partner-integrations/mcp-sdk), [OpenClaw](https://mpp.dev/partner-integrations/openclaw); community [extensions](https://mpp.dev/extensions)
- Docs MCP: `claude mcp add --transport http mpp https://mpp.dev/api/mcp` (8 tools: `list_pages`, `read_page`, `search_docs`, `search_source`, `list_sources`, `list_source_files`, `read_source_file`, `get_file_tree`). Services MCP: [mpp.dev/mcp/services](https://mpp.dev/mcp/services)
- Upstream publishes its own machine-readable skill at `mpp.dev/.well-known/agent-skills/mppx/SKILL.md`; install via `npx skills add tempoxyz/mpp -g` or `mppx skills add`
