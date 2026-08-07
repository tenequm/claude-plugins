---
name: mcp-best-practices
description: Build, secure, and optimize production MCP servers with the TypeScript SDK (spec 2026-07-28, SDK v2.0.0 stable / v1.30). Use when building or reviewing MCP servers or tools - covering transports, tool and schema design, error handling, security and OAuth, performance, known SDK bugs, content vs structuredContent delivery, v2 migration, MCP Apps, extensions, and the Registry.
metadata:
  version: "1.0.0"
  upstream: "@modelcontextprotocol/sdk@1.30.0, @modelcontextprotocol/server@2.0.0, @modelcontextprotocol/ext-apps@1.7.5, modelcontextprotocol-spec@2026-07-28"
  openclaw:
    homepage: https://github.com/tenequm/skills/tree/main/skills/mcp-best-practices
    emoji: "🔌"
    envVars:
      - name: MAX_MCP_OUTPUT_TOKENS
        required: false
        description: Claude Code client-side cap on MCP tool result size, referenced in the result-size budget guidance
---

# MCP Best Practices

Decision reference for building production MCP servers with the TypeScript SDK. Not a tutorial - assumes you already have a working server and need to make it correct, fast, and secure.

## Quick Reference

| Component | Current | Notes |
|-----------|---------|-------|
| Spec (released) | **2026-07-28** ([specification](https://modelcontextprotocol.io/specification/latest)) | Stateless/sessionless overhaul - see "Spec 2026-07-28" below and `references/spec-2026-07-28.md` |
| Spec (still deployed) | **2025-11-25** | What most shipped clients and servers actually speak today; the v2 SDK's default |
| TS SDK (current) | **v2.0.0** (2026-07-27), nine packages in lockstep: `/server`, `/client`, `/core`, `/hono`, `/express`, `/node`, `/fastify`, `/codemod`, `/server-legacy` | Speaks 2025-era by default; 2026-07-28 is opt-in |
| TS SDK (legacy) | **v1.30.0** (`@modelcontextprotocol/sdk`) | Bug + security fixes for >=6 months after v2 GA; source on the [`v1.x` branch](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x) |
| JSON Schema | **2020-12** default (2019-09 / draft-07 accepted since v2.0.0) | - |
| Transport | **Streamable HTTP** (remote), **stdio** (local) | SSE + WebSocket removed in v2 |
| Extensions | **MCP Apps** (Stable, SEP-1865), **Auth Extensions** (official), **Tasks** ([ext-tasks](https://github.com/modelcontextprotocol/ext-tasks)) | Domain-specific WGs |
| Registry | **Preview** with v0.1 API freeze since 2025-10-24 ([registry](https://modelcontextprotocol.io/registry/about)) | GA pending |

**v2 imports** (current):
```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { ProtocolError, ProtocolErrorCode } from "@modelcontextprotocol/core";
```

**v1 imports** (legacy line, still widely deployed):
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

### The Two Eras

The most decision-relevant fact after the 2026-07-28 release: **upgrading to SDK v2.0.0 does not move you to the new spec.** Nothing in v2 puts a 2026-07-28 byte on the wire by default - a hand-constructed `Client`/`Server`/`McpServer` keeps speaking the 2025-era protocol it was written for.

Every revision from `2024-10-07` through `2025-11-25` opens with `initialize` and shares one wire behavior - the SDK calls that family **legacy**. `2026-07-28` starts the **modern** era: no `initialize`, a `server/discover` advertisement instead, a `_meta` envelope on every request. Selection is explicit:

| `versionNegotiation.mode` | Behavior |
|---|---|
| absent / `'legacy'` | The 2025 `initialize` handshake, byte for byte. No probe. **This is the default.** |
| `'auto'` | Probe with `server/discover`; fall back to `initialize` against a 2025-only server |
| `{ pin: '2026-07-28' }` | That revision or nothing - a pin never falls back |

Build new servers on the 2025-era wire unless you control both ends. The stateless design guidance throughout this skill is what makes the eventual era switch cheap.

Canonical SDK docs: [ts.sdk.modelcontextprotocol.io](https://ts.sdk.modelcontextprotocol.io) (v1) and [/v2/](https://ts.sdk.modelcontextprotocol.io/v2/). Test with the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) ([debugging guide](https://modelcontextprotocol.io/docs/tools/debugging)), then check your server against the [conformance suite](https://github.com/modelcontextprotocol/conformance) - a runnable CLI, not just a spec-process gate: `npx @modelcontextprotocol/conformance server --url http://localhost:3000/mcp` (`--spec-version` filters by revision). It also scores SDKs for the [tier system](https://modelcontextprotocol.io/community/sdk-tiers) (T1: TypeScript, Python, C#, Go; T2: Java, Rust, Ruby; T3: Swift, PHP, Kotlin).

## Server Setup

### Transport Decision

| Scenario | Transport | Key Config |
|----------|-----------|------------|
| Remote, stateless (K8s, CF Workers) | `WebStandardStreamableHTTPServerTransport` | `sessionIdGenerator: undefined`, `enableJsonResponse: true` |
| Remote, stateful (long tasks, SSE) | `WebStandardStreamableHTTPServerTransport` | `sessionIdGenerator: () => randomUUID()` |
| Local CLI / Claude Desktop | `StdioServerTransport` | Default |
| Legacy SSE clients | SSE removed in v2 - migrate to Streamable HTTP | - |

### Stateless Pattern (recommended for remote deployment)

Per-request server+transport creation is the canonical pattern. Maintainer @ihrpr confirms: "each transport should have an instance of MCPServer" ([#343](https://github.com/modelcontextprotocol/typescript-sdk/issues/343)). Sharing instances leaks cross-client data (GHSA-345p-7cg4-v4c7).

```typescript
app.post("/mcp", async (c) => {
  const server = new McpServer({ name: "my-server", version: "1.0.0" });
  // Register tools, resources, prompts...
  registerTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,   // stateless - no session tracking
    enableJsonResponse: true,        // JSON responses, no SSE streaming
  });

  // All tools/resources must be registered before connect() (#893)
  try {
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  } finally {
    await transport.close();
    await server.close();
  }
});
```

**What to hoist to module level** (don't recreate per request):
- Zod schemas (they never change)
- Annotation objects (`{ readOnlyHint: true, ... }`)
- Tool description strings
- Payment configs, upstream API clients

The McpServer itself must be per-request, but its constant inputs should not be.

**If you only route POST** (the common stateless layout), answer `GET /mcp` with an explicit **405 Method Not Allowed** - the spec requires 405 when no SSE stream is offered, and the official TS client treats 405 as the benign no-stream signal, while an empty `200` sends it into a reconnect storm. See `references/transport-patterns.md`.

> For deep dive on transports, sessions, HTTP/2 gotchas, and K8s deployment: see `references/transport-patterns.md`

### Framework Integration

**Hono** (web-standard): route `POST /mcp` to the `WebStandardStreamableHTTPServerTransport` handler; optionally add `GET /mcp` (SSE notifications) and `DELETE /mcp` (session termination) on 2025-era wires. v2 ships `@modelcontextprotocol/hono` (`createMcpHonoApp`).

**Cloudflare Workers**: same pattern - the transport works natively in the Workers runtime. Call `preloadSchemas()` at module scope; v2's workerd build does it automatically.

**Express/Node** (v2): Use `@modelcontextprotocol/express` middleware with `NodeStreamableHTTPServerTransport` (wraps the Web Standard transport for `IncomingMessage`/`ServerResponse`).

## Tool Design

### Registration API

**v1 (legacy line)** - `server.tool(name, description, zodShape, annotations, handler)`. Positional overloads are ambiguous; same fields as v2 below minus `outputSchema`. Removed entirely in v2.

**v2 (current)** - `registerTool()` with config object:
```typescript
server.registerTool("search_docs", {
  title: "Document Search",
  description: "Search documents by keyword or phrase",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    max_results: z.number().optional().describe("Max results (default 20)"),
  }),
  outputSchema: z.object({
    results: z.array(z.object({ id: z.string(), text: z.string() })),
    has_more: z.boolean(),
  }),
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
}, async ({ query, max_results }) => {
  const result = await fetchDocs(query, max_results);
  return {
    // Both channels carry IDENTICAL bytes. Divergent payloads = the text block
    // silently vanishes on Claude Code/Codex/Copilot. See "Tool Result Delivery" below.
    structuredContent: result,
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
});
```

### Naming

Spec (2025-11-25, SHOULD-level recommendations, not MUSTs): names SHOULD be 1-128 chars, case-sensitive. Allowed: `A-Za-z0-9_-.`

**DO**: `search_docs`, `get_user_profile`, `admin.tools.list`
**DON'T**: `search` (too generic, collides across servers), `Search Docs` (spaces not allowed)

Service-prefix your tools (`github_*`, `jira_*`) when multiple servers are active - LLMs confuse generic names across servers.

### Schema Rules

`.describe()` on every field - this is what LLMs use for argument generation.

> For complete Zod-to-JSON-Schema conversion rules, what breaks silently, outputSchema/structuredContent patterns: see `references/tool-schema-guide.md`

**Critical bugs** (detail + status in the Known SDK Bugs table below; conversion deep-dive in the reference):
- `z.union()`/`z.discriminatedUnion()` silently produce empty schemas on all released v1 ([#1643](https://github.com/modelcontextprotocol/typescript-sdk/issues/1643)) - use flat `z.object()` + `z.enum()` discriminator.
- Raw JSON Schema objects throw at registration since v1.28 ([#1596](https://github.com/modelcontextprotocol/typescript-sdk/issues/1596)); `z.transform()` is silently stripped ([#702](https://github.com/modelcontextprotocol/typescript-sdk/issues/702)).
- Client AJV rejects unstripped `structuredContent` extras (Zod v4 emits `additionalProperties: false`): `.parse()` upstream data before assigning, or `.passthrough()` for intentional extras.

### Annotations

All are optional hints (untrusted from untrusted servers per spec):

| Annotation | Default | Meaning |
|------------|---------|---------|
| `readOnlyHint` | `false` | Tool doesn't modify its environment |
| `destructiveHint` | `true` | May perform destructive updates (only when readOnly=false) |
| `idempotentHint` | `false` | Repeated calls with same args have no additional effect |
| `openWorldHint` | `true` | Interacts with external entities (APIs, web) |

Set them accurately - clients use them for consent prompts and auto-approval decisions.

**The "Lethal Trifecta"**: combining (1) access to private data + (2) exposure to untrusted content + (3) external communication ability creates data-theft conditions (demonstrated via a malicious calendar event + MCP calendar server + code-execution tool). Design tool sets so no single agent holds all three.

### Other Tool-Definition Fields

- **`icons`** ([SEP-973](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)): tools, resources, prompts, and implementations can carry `icons: [{ src, mimeType, sizes }]` for client UI display.
- **`listChanged` capability + `notifications/tools/list_changed`**: declare `tools: { listChanged: true }` and emit the notification when the tool set changes at runtime - required plumbing if you adopt the dynamic tool loading strategy from "Token Bloat Mitigation". On 2026-07-28 the client opts into delivery via the `subscriptions/listen` filter.
- **`execution.taskSupport`** (**2025-11-25 only**): per-tool negotiation of task-augmented execution - `"forbidden"` (default), `"optional"`, `"required"`. **Removed in 2026-07-28** along with core tasks; the field is absent from that revision's schema. Tasks now live in the `io.modelcontextprotocol/tasks` extension.

### Stateful Tools

With no protocol-level session on 2026-07-28, a server cannot rely on implicit per-connection state. The spec's (non-normative) answer: a creation tool returns an explicit handle (`create_basket` -> `{ basket_id: "bsk_a1b2c3" }`) that later tools accept as an ordinary argument. The model carries it forward. Four design rules:

- **Authorization** - a handle is a name, not a capability. Validate the caller against it on *every* call. Unauthenticated servers make it a de facto bearer token: real entropy (UUIDv4), bounded lifetime.
- **Opacity** - handles encoding internal structure invite parsing and guessing.
- **Lifetime** - state the retention policy in the *creation tool's description* ("baskets expire after 24h of inactivity") so the model sees it when deciding to create state.
- **Expiry errors** - a call against an expired or unknown handle returns a tool execution error saying so, so the model can recover by creating a new one.

## Tool Result Delivery: `content` vs `structuredContent`

**The footgun:** when a tool returns BOTH a text `content` block and `structuredContent`, several major clients (Claude Code, Codex CLI, VS Code Copilot, Goose) silently drop the text block and forward only `structuredContent` to the model. If the two payloads differ, the human-readable one vanishes. This is **client behavior the spec does not constrain** - not an SDK transform. Don't return both channels expecting both to reach the model.

### Empirically tested - Claude Code 2.1.165 (MCP 2025-11-25)

Measured with `claude -p --output-format=stream-json`, reading the exact `tool_result` the model received:

| Tool returns | What the model receives |
|--------------|-------------------------|
| One text block, no `structuredContent` | text verbatim |
| `content: []` + `structuredContent` | `JSON.stringify(structuredContent)` as a string in the content slot - works |
| text block + `structuredContent` | **text block silently dropped**; `structuredContent` wins |
| text + `structuredContent` + `outputSchema` | same - **`outputSchema` makes zero difference** |
| two text blocks, no `structuredContent` | both preserved verbatim |

`structuredContent` is **not a separate typed channel to the model** on Claude Code - it is stringified into the standard `tool_result` content slot, so it costs the **same tokens** as the equivalent JSON-as-text. It does not buy cheaper or out-of-band structured data.

Intentional, per Anthropic maintainer ([anthropics/claude-code#9962](https://github.com/anthropics/claude-code/issues/9962)): structuredContent support landed in Claude Code v2.0.21 and "we made `structuredContent` the default when both formats are present... optimizing for agent performance." Reproduced across unrelated servers (Laravel, Roblox Studio, YouTube) - host-side precedence, not a server bug.

### What the spec actually says (2025-11-25)

- `content` is **required** on `CallToolResult` (`content: ContentBlock[]`); `structuredContent?` and `isError?` are optional. An empty `content: []` is schema-valid.
- Backwards-compat **SHOULD** (the only relevant normative line): *"a tool that returns structured content SHOULD also return the serialized JSON in a TextContent block."*
- **No precedence rule.** The spec never says which field a client should prefer when both are present ([Discussion #1563](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1563); clarification in flight via SEP-1624 -> SEP-2200). That gap is the documented root cause of client divergence.
- `outputSchema`: servers **MUST** produce conforming `structuredContent`; clients **SHOULD** (not MUST) validate it.

The official TypeScript SDK passes both fields through **verbatim** on server and client (the only mutation is optional outputSchema validation, which can throw). Any stringify-into-content you observe is the host harness, not the SDK.

### Cross-client behavior (the matrix above is Claude Code only)

| Client | When both `content` + `structuredContent` present |
|--------|---------------------------------------------------|
| Claude Code CLI, OpenAI Codex CLI, VS Code Copilot, Goose | **shadow** - only `structuredContent` reaches the model (text dropped) |
| Cursor, Claude.ai web, ChatGPT MCP connector | prefer `content` / surface both to the model |
| Google ADK (framework) | forwards both by default; content-only is opt-in |

VS Code maintainer's framing ([microsoft/vscode#290063](https://github.com/microsoft/vscode/issues/290063)): *"structuredContent actually should not be presented to the model, its use case is PTC [programmatic tool calling]."* Clients disagree on enforcing that, so portable servers can't rely on it either way. (Non-Claude-Code rows come from issue trackers/maintainer statements, not the stream-json harness - treat exact delivery as client-version-dependent.)

### The rule for server authors

- **DON'T** return divergent `content` and `structuredContent` (e.g. a rendered ASCII table as text + different JSON as structured). On shadowing clients the text silently disappears and only the JSON reaches the model.
- **DO**, if you emit `structuredContent`, mirror the **same bytes** into a text block: `content: [{ type: "text", text: JSON.stringify(payload) }]`. This is the spec's backwards-compat SHOULD. Shadowing clients use the structured copy; others fall back to the identical text - either way the model gets the data. Mirroring does not double tokens on shadowing clients (they drop the text).
- **PREFER one channel per tool / per mode.** For a human-readable rendering (table, summary) to reach the model, return it as **text only, no `structuredContent`** - or expose a `format: "table" | "json"` arg (`table` -> text-only; `json` -> JSON mirrored into both channels). Both are empirically valid on Claude Code and keep one channel per call.
- `outputSchema` gates client-side validation only; it does **not** make the text block survive on shadowing clients.

### Beyond Text: Content Types

`content` blocks are not text-only: the spec defines `image`, `audio`, `resource_link`, and embedded `resource` blocks, all supporting optional annotations (`audience`, `priority`, `lastModified`). Resource links returned by tools are not guaranteed to appear in `resources/list`. For image-returning tools, don't inline full-resolution base64 - see `references/tool-schema-guide.md` for content types and the preview + URL pattern.

## Error Handling

Two distinct mechanisms with different LLM visibility:

| Type | LLM Sees It? | Use For |
|------|--------------|---------|
| **Tool error** (`isError: true` in CallToolResult) | Yes - enables self-correction | Input validation, API failures, business logic errors |
| **Protocol error** (JSON-RPC error response) | Maybe - clients MAY expose | Unknown tool, malformed request, server crash |

Per SEP-1303 (merged into spec 2025-11-25): input validation errors MUST be tool execution errors, not protocol errors. The LLM needs to see "date must be in the future" to self-correct.

```typescript
// DO: Tool execution error - LLM can self-correct
return {
  isError: true,
  content: [{ type: "text", text: "Date must be in the future. Current date: 2026-03-25" }],
};

// DON'T: Protocol error for validation - LLM can't see this
throw new McpError(ErrorCode.InvalidParams, "Invalid date");
```

**Known SDK behavior**: When the SDK converts an `McpError` thrown from a tool handler into a `CallToolResult`, the `error.data` field is dropped. If you embed structured data in McpError's `data` field, it may not reach the client. The x402/MPP MCP ecosystem standardized on `isError: true` tool results with `structuredContent` for this reason. Do **not** reach for `-32042` as a "Payment Required" code - spec 2026-07-28 allocates it (as retired URL-elicitation) inside the spec-reserved `-32020..-32099` range; see `references/error-handling.md`.

> For full error taxonomy, code examples, and payment error patterns: see `references/error-handling.md`

## Resources and Instructions

### Server Instructions

Set in the initialization response - acts as a system-level hint to the LLM about how to use your server:

```typescript
const server = new McpServer({
  name: "docs-api",
  version: "1.0.0",
  instructions: "Knowledge base API. Use search_docs for full-text search, get_doc for retrieval by ID. All tools are read-only.",
});
```

### Resource Registration

Expose documentation or structured data via `docs://` URI scheme:

```typescript
server.resource("search-operators", "docs://search-operators", {
  title: "Search Operators Guide",
  description: "Supported search operators and syntax",
  mimeType: "text/markdown",
}, async () => ({
  contents: [{ uri: "docs://search-operators", text: operatorsMarkdown }],
}));
```

## Other Server Primitives

Beyond tools, the spec (2025-11-25) defines primitives a production server often needs. All are optional capabilities negotiated at initialization; a server that omits them still conforms.

| Primitive | Methods | When you need it |
|-----------|---------|------------------|
| **Prompts** | `prompts/list`, `prompts/get` (`registerPrompt`) | Reusable, parameterized prompt templates users invoke by name (slash-commands, canned workflows). Args are completable. |
| **Resource Templates** | `resources/templates/list` (RFC 6570 URI templates) | Parameterized resources - `docs://{id}` instead of enumerating every static URI. Template variables are completable. |
| **Pagination** | opaque `cursor` param + `nextCursor` in result, on every `*/list` | Large tool/resource/prompt catalogs. The cursor is opaque - never parse or synthesize it; loop until `nextCursor` is absent. Distinct from in-tool `offset`/`limit` args. |
| **Completions** | `completion/complete` | Argument autocomplete for prompt args and resource-template variables. Return ranked candidates with `hasMore`/`total` hints. |
| **Cancellation** | `notifications/cancelled` | Client aborts an in-flight long request by id. Honor it via the handler's abort signal (`extra.signal` v1 / `ctx.mcpReq.signal` v2) - stop work, release resources. |

Pagination is the one most servers actually hit first: a `tools/list` (or `resources/list`) with 50+ entries should paginate rather than dump everything in one response.

## Performance

### Module-Level Caching

The McpServer must be per-request, but everything else can be shared:

```typescript
// Module-level (created once)
const SCHEMAS = {
  search: z.object({ query: z.string().describe("Search query") }),
  fetch: z.object({ id: z.string().describe("Resource ID") }),
};
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
} as const;

// Per-request (created each time)
function createMcpServer(ctx: Context) {
  const server = new McpServer({ name: "my-server", version: "1.0.0" });
  server.tool("search", "Search", SCHEMAS.search, READ_ONLY_ANNOTATIONS, handler);
  return server;
}
```

### Token Bloat Mitigation

Tool definitions consume context window before any conversation starts. GitHub MCP: 20,444 tokens for 80 tools (SEP-1576).

**Strategies**:
1. **5-15 tools per server** - community sweet spot. Split beyond that.
2. **Outcome-oriented tools** - bundle multi-step operations into single tools (e.g., `track_order(email)` not `get_user` + `list_orders` + `get_status`).
3. **Response granularity** - return curated results, not raw API dumps. 800-token user object vs 20-token summary.
4. **`outputSchema` + `structuredContent`** - typed output for programmatic/PTC clients. Caveat: on shadowing clients (Claude Code et al.) `structuredContent` is stringified into the model's context at the **same token cost as text** - it is not a free out-of-band channel. See "Tool Result Delivery: content vs structuredContent".
5. **Dynamic tool loading** - register only relevant tool subsets based on request context (e.g., `?tools=search,fetch` query parameter). Pair with the `listChanged` capability if the set changes mid-session.
6. **Progressive tool discovery / code mode** - clients with large catalogs increasingly use a `search_tools` meta-tool and programmatic tool calling (code mode), where `structuredContent` is consumed outside the model context. Both are documented in [client best practices](https://modelcontextprotocol.io/docs/develop/clients/client-best-practices) - design curated, well-described tools so these flows work.

### Result-Size Budgets (per-client caps)

Clients silently truncate large tool results. Budget for the strictest client you target:

| Client | Default cap | Configurable |
|--------|------------|--------------|
| Claude Code | 25,000 tokens (warning at 10k) | `MAX_MCP_OUTPUT_TOKENS` env; per-tool `_meta["anthropic/maxResultSizeChars"]` up to 500,000 chars |
| OpenAI Codex CLI | 10,000 bytes on byte-policy models (includes the JSON envelope) | `tool_output_token_limit` config |
| Gemini CLI | 40,000 chars (head 20% / tail 80% trim; full output saved to a file) | settings; 0 or negative disables |

Enforce your own cap server-side - see "Result-Size Budgets and Truncation" in `references/tool-schema-guide.md`. Two rules worth stating here: **never truncate `isError` results** (payment/auth challenges must survive intact), and treat client budgets as **per-connection properties** - accept them as URL query params (`?max_chars=`, alongside `?tools=`) rather than growing every tool schema with override args.

### No-Parameter Tools

For tools with no inputs, use explicit empty schema:
```typescript
inputSchema: { type: "object" as const, additionalProperties: false }
```

## Security

### Top Threats (real-world incidents, 2025-2026)

| Attack | Example | Mitigation |
|--------|---------|------------|
| **Tool poisoning** | Hidden instructions in descriptions (WhatsApp MCP, Apr 2025) | Review tool descriptions; clients should display them |
| **Supply chain** | Malicious npm packages (Smithery breach, Oct 2025) | Pin versions, audit dependencies |
| **Command injection** | `child_process.exec` with unsanitized input (CVE-2025-53967) | Never interpolate user input into shell commands |
| **Stdio config injection** | User-controlled input reaches `StdioServerParameters` without sanitization (OX Security disclosure, 2026-04-15) | Sanitize stdio config inputs in client code; prefer first-party servers; treat by Anthropic as "by design" - not patched in SDK |
| **Cross-server shadowing** | Malicious server overrides legitimate tool names | Service-prefix tool names; validate tool sources |
| **Token theft** | Over-privileged PATs with broad scopes | Minimal scopes; OAuth 2.1 Resource Indicators (RFC 8707) |
| **Token passthrough** | Server accepts/forwards tokens not issued for it | Validate audience claim; never transit client tokens to upstream APIs |
| **SSRF** | Malicious OAuth metadata URLs targeting internal services | HTTPS enforcement, block private IPs, validate redirect targets |
| **Confused deputy** | Proxy server consent cookies exploited via DCR | Per-client consent before forwarding to third-party auth |
| **Session hijacking** | Stolen/guessed session IDs for impersonation | Cryptographically random IDs, bind to user identity, never use for auth |
| **Cross-client response leak** | Shared `McpServer`/transport reused across clients ([CVE-2026-25536](https://nvd.nist.gov/vuln/detail/cve-2026-25536), affects v1.10.0-1.25.3) | **Require SDK ≥ v1.26.0**; per-request server+transport |
| **UriTemplate ReDoS** | Malicious URI patterns ([CVE-2026-0621](https://github.com/modelcontextprotocol/typescript-sdk/pull/1365)) | Upgrade to v1.25.2+ / v2.0.0-alpha.1+ |

### Server-Side Requirements (spec normative)

- **Validate all inputs** at tool boundaries
- **Implement access controls** per user/session
- **Rate limit** tool invocations
- **Sanitize outputs** before returning to client
- **Validate the `Origin` header** - but only reject when it is **present and invalid**: *"If the `Origin` header is present and invalid, servers MUST respond"* with 403. Shipping clients exist that send no `Origin` at all; a blanket 403-on-missing locks them out.
- **Handle `MCP-Protocol-Version` leniently.** On 2025-era wires it is required after initialization (spec 2025-06-18+); on 2026-07-28 there is no initialization and the version rides `_meta` per request. Accept a range of declared versions rather than enforcing one - clients advertising `2024-11-05` are still in the wild.
- **Bind local servers to localhost** (127.0.0.1) only

### Auth (OAuth 2.1)

MCP normatively requires **OAuth 2.1** ([draft-ietf-oauth-v2-1-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13); "Authorization servers MUST implement OAuth 2.1"), not 2.0 - PKCE mandatory, implicit flow removed. Servers are OAuth 2.1 Resource Servers; clients MUST send Resource Indicators (RFC 8707) binding tokens to your server.

- **Validate audience** - reject tokens not issued for your server (passthrough is forbidden)
- **PKCE `S256`**, **short-lived tokens**, **minimal scopes** (elevate via `WWW-Authenticate` challenges)
- Use a tested validation library (Keycloak, Auth0, ...) - don't roll your own; never log Authorization headers/tokens/secrets
- **RFC 9207 `iss` interop footgun**: advertising `authorization_response_iss_parameter_supported: true` (Better-Auth's oauth-provider does by default) makes strict clients (rmcp >= 1.8.0, e.g. Codex 0.143-0.145) MUST-validate the callback `iss` - and a client that drops `iss` ([openai/codex#33354](https://github.com/openai/codex/issues/33354)) then hard-fails login on a spec-correct server. Absorb it server-side: advertise the flag as `false` while still sending `iss`. See `references/security-auth.md`.

> For full security attack/mitigation patterns and auth implementation details: see `references/security-auth.md`

## Known SDK Bugs

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| [#1643](https://github.com/modelcontextprotocol/typescript-sdk/issues/1643) - `z.union()`/`z.discriminatedUnion()` silently dropped | High | Fixed in the v2 line ([PR #1796](https://github.com/modelcontextprotocol/typescript-sdk/pull/1796)); v1.x backport [PR #2017](https://github.com/modelcontextprotocol/typescript-sdk/pull/2017) **still open** | Use flat `z.object()` + `z.enum()`. Present on **every released v1 including v1.30.0** (still routed through `normalizeObjectSchema`) |
| [#1699](https://github.com/modelcontextprotocol/typescript-sdk/issues/1699) - Transport closure stack overflow (15-25+ concurrent) | High | Fixed on the **v2 line only** (PR #1788, merged to `main` 2026-04-02); no v1 backport observed | Move to v2, or cap concurrent transport closures on v1 |
| [#1619](https://github.com/modelcontextprotocol/typescript-sdk/issues/1619) - HTTP/2 + SSE Content-Length error | Medium | Closed (reclassified to upstream `@hono/node-server#266`) | Use `enableJsonResponse: true` or avoid HTTP/2 upstream |
| [#893](https://github.com/modelcontextprotocol/typescript-sdk/issues/893) - Dynamic registration after connect blocked | Medium | **Open on both `main` and `v1.x`** - `set*RequestHandlers()` calls `registerCapabilities()` unconditionally, which throws once a transport is attached | Register all tools/resources before `connect()`. If you must register later, register one dummy tool/resource/prompt *before* `connect()` to force handler initialization |
| [#1596](https://github.com/modelcontextprotocol/typescript-sdk/issues/1596) - Plain JSON Schema silently dropped | Fixed | v1.28.0 (now throws at registration) | v1: pass Zod. v2: wrap with `fromJsonSchema()` |
| Client AJV strict rejects unstripped `structuredContent` extras | High | Behavior, not bug | Server `.parse()` upstream data before returning, or use `.passthrough()` |
| GHSA-345p-7cg4-v4c7 / [CVE-2026-25536](https://nvd.nist.gov/vuln/detail/cve-2026-25536) - Shared instances leak cross-client data | Critical | Fixed v1.26.0 | **Require ≥ v1.26.0** (or v2.0.0-alpha.1+); per-request server+transport |
| [CVE-2026-0621](https://github.com/modelcontextprotocol/typescript-sdk/pull/1365) - UriTemplate ReDoS | Medium | Fixed v1.25.2 / v2.0.0-alpha.1 | Upgrade |

## V2 Migration

> For comprehensive migration guide with all breaking changes and before/after code: see `references/v2-migration.md`

**Key breaking changes**:
1. Package split: `@modelcontextprotocol/sdk` -> `@modelcontextprotocol/server` + `/client` + `/core`
2. ESM-first (CJS builds restored in beta.2), Node.js 20+ (Bun/Deno supported)
3. Zod v4 required (or any Standard Schema library)
4. `McpError` -> `ProtocolError` (from `@modelcontextprotocol/core`)
5. `extra` parameter -> structured `ctx` with `ctx.mcpReq`
6. `server.tool()` -> `registerTool()` (config object, not positional args)
7. SSE server transport removed (clients can still connect to legacy SSE servers)
8. `@modelcontextprotocol/hono` and `@modelcontextprotocol/express` middleware packages
9. DNS rebinding protection enabled by default for localhost servers

v1.x gets 6 more months of support after v2 stable ships. No rush, but write new code with v2 patterns in mind.

## Spec 2026-07-28 (released)

Published 2026-07-28 ([release announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)) - now the latest revision. Remember it is **opt-in on the SDK** (see "The Two Eras"): 2025-11-25 remains what most deployed software speaks.

> Full detail - `_meta` identity keys, `subscriptions/listen` filters, `requestState`, `Mcp-Name` Base64 encoding, `DiscoverResult`, cacheable results, the error-code policy, and the deprecation table: see `references/spec-2026-07-28.md`

Decision-relevant shifts:

- **MCP is stateless and sessionless.** The `initialize`/`notifications/initialized` handshake and the `Mcp-Session-Id` header are gone ([SEP-2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575), [SEP-2567](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2567)). Every request carries its protocol version, client identity, and capabilities in `_meta`. Cross-call state uses **server-minted handles passed as ordinary tool arguments** - see "Stateful Tools" above. This vindicates the stateless stance throughout this skill; do not build new servers on session affinity.
- **`server/discover`**: servers **MUST** implement it to advertise versions/capabilities/identity; clients **MAY** call it before anything else (they may also skip it and handle `UnsupportedProtocolVersionError` inline).
- **`subscriptions/listen` replaces the HTTP GET stream and `resources/subscribe`/`unsubscribe`** - one long-lived POST-response stream with an opt-in notification filter; the server **MUST NOT** send types the client didn't request. The same pass **removes `ping`, `logging/setLevel`, and `notifications/roots/list_changed`** (log level moves per-request into `_meta`, and servers MUST NOT emit `notifications/message` without it).
- **SSE resumability is removed** - `Last-Event-ID` and SSE event IDs leave Streamable HTTP; clients MUST re-issue an interrupted request with a new ID. Don't build new replay/event-store infrastructure.
- **Elicitation cleanup**: `notifications/elicitation/complete` and URL-mode `elicitationId` are removed; servers correlate an out-of-band interaction across retries via `requestState`. Sampling's `includeContext` values `"thisServer"`/`"allServers"` are Deprecated.
- **Multi Round-Trip Requests (MRTR)** replace server-initiated requests (`roots/list`, `sampling/createMessage`, `elicitation/create`): a tool returns `inputRequests`; the client answers with `inputResponses` on a retry of the original request ([SEP-2322](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2322)). All results carry a required `resultType` (`complete` | `input_required`).
- **Error codes are partitioned** ([PR #2907](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2907)): `-32020..-32099` reserved for the spec (MUST NOT emit undefined codes from it); `-32000..-32019` is **legacy** - new implementations SHOULD NOT use it at all. **Allocate application-defined codes outside `-32768..-32000`.** Renumbering: -32001->-32020, -32003->-32021, -32004->-32022; resource-not-found settles on `-32602`.
- **Formal feature lifecycle** (Active/Deprecated/Removed, 12-month minimum window, [deprecated registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)). **Roots, Sampling, Logging, and the HTTP+SSE transport are Deprecated** (SEP-2577, SEP-2596).
- **Auth**: DCR is **deprecated in favor of Client ID Metadata Documents (CIMD)** ([PR #2858](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2858)); clients MUST validate a present `iss` ([SEP-2468](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2468)), key credentials by issuer ([SEP-2352](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2352)), and declare an OIDC `application_type` ([SEP-837](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/837)). Scope accumulation is now a client-side responsibility - see `references/security-auth.md`.
- **Caching**: list/read results carry required `ttlMs` + `cacheScope` via `CacheableResult` ([SEP-2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549)); return tools in deterministic order for prompt-cache hits. **HTTP**: POSTs require `Mcp-Method`/`Mcp-Name` headers ([SEP-2243](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2243)). **Schemas loosen** to any JSON Schema 2020-12 keywords with `$ref` resolution; `structuredContent` may be any JSON value ([SEP-2106](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2106)). **OTel** trace context rides `_meta` ([SEP-414](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/414)).

The `content` vs `structuredContent` dual-delivery footgun is **unchanged** - the backwards-compat SHOULD persists and no precedence rule landed, so the guidance above still holds.

Ecosystem gates: a Standards-Track SEP can no longer reach Final without a matching scenario in the [conformance suite](https://github.com/modelcontextprotocol/conformance) (SEP-2484). A [Server Card](https://github.com/modelcontextprotocol/experimental-ext-server-card) working group is standardizing server self-description - a JSON document with `GET <streamable-http-url>/server-card` reserved as the recommended location and the catalog at `.well-known/mcp/catalog.json`; SEP-2127 is still Draft.

## Extensions

MCP extensions are optional, strictly additive capabilities on top of the core protocol. On 2025-era wires both sides negotiate support during initialization via `extensions` in capabilities. On 2026-07-28 there is no initialization: clients advertise extension support **per request**, in `_meta["io.modelcontextprotocol/clientCapabilities"]`.

**Identifiers**: `{vendor-prefix}/{extension-name}`. Official: `io.modelcontextprotocol/*`. Third-party: reversed domain (e.g., `com.example/my-ext`).

### Official Extensions

| Extension | Identifier | Purpose |
|-----------|-----------|---------|
| **MCP Apps** | `io.modelcontextprotocol/ui` | Interactive HTML UIs in chat (charts, forms, dashboards) |
| **OAuth Client Credentials** | `io.modelcontextprotocol/oauth-client-credentials` | Machine-to-machine auth (CI/CD, daemons, server-to-server) |
| **Enterprise-Managed Auth** | `io.modelcontextprotocol/enterprise-managed-authorization` | Centralized access control via enterprise IdP |

**Client support**: Claude (web + Desktop), ChatGPT, VS Code Copilot, Goose, Postman, MCPJam, Microsoft 365 Copilot, Cursor, Archestra.AI, and PostHog Code all support MCP Apps ([client matrix](https://modelcontextprotocol.io/extensions/client-matrix)). Among auth extensions, **Enterprise-Managed Authorization reached Stable** (2026-06-18) with Archestra.AI as the first client shipping it; OAuth Client Credentials is still Draft with no client adoption yet.

> For MCP Apps architecture, ext-apps SDK, and build patterns: see `references/mcp-apps.md`
> For extensions system, auth extensions, and MCP Registry: see `references/extensions-registry.md`
> For the released 2026-07-28 revision in full: see `references/spec-2026-07-28.md`

### Server Capabilities Beyond Tools

| Capability | Purpose | v2 API |
|-----------|---------|--------|
| **Elicitation** | Request structured user input mid-tool | `ctx.mcpReq.elicitInput()` |
| **Sampling** | Request LLM completion from client | `ctx.mcpReq.requestSampling()` |
| **Tasks** | Long-running ops with lifecycle management | Official extension (SEP-2663) |
| **Progress** | Incremental progress on requests | `ctx.mcpReq.sendProgress()` |

These are the 2025-era APIs (still the SDK default). On 2026-07-28 servers cannot send requests to clients at all: elicitation and sampling go through MRTR - return an `InputRequiredResult` and read the client's `inputResponses` on its retry.

**Deprecation / status notice**: **Roots, Sampling, and Logging are Deprecated** under the formal feature lifecycle ([SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577)) - no wire changes, features stay functional through a 12-month minimum window, but design new servers without them. **Tasks** moved out of the core spec (the experimental `tasks` feature in 2025-11-25 is removed) into the official `io.modelcontextprotocol/tasks` extension ([SEP-2663](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2663)), whose full specification lives in the [ext-tasks repo](https://github.com/modelcontextprotocol/ext-tasks) and [docs](https://modelcontextprotocol.io/docs/extensions/tasks/overview): a server may answer `tools/call` with an async task handle the client **polls** via `tasks/get` + `tasks/update` (`tasks/cancel` to abort). The redesign drops the blocking `tasks/result` and `tasks/list` methods and allows servers to return task handles unsolicited. In v2 the entire 2025-era `tasks/*` wire vocabulary is `@deprecated` and excluded from the typed method maps.
