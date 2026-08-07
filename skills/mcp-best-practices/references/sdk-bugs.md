# Known SDK Bugs

Open and recently-fixed defects in the TypeScript SDK that change how you write server code. Status verified against `@modelcontextprotocol/sdk@1.30.0` (legacy line) and `@modelcontextprotocol/server@2.0.0`.

`SKILL.md` carries the four must-know entries inline; this is the full table with status and workarounds.

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| [#1643](https://github.com/modelcontextprotocol/typescript-sdk/issues/1643) - `z.union()`/`z.discriminatedUnion()` silently dropped | High | Fixed in the v2 line ([PR #1796](https://github.com/modelcontextprotocol/typescript-sdk/pull/1796)); v1.x backport [PR #2017](https://github.com/modelcontextprotocol/typescript-sdk/pull/2017) **still open** | Use flat `z.object()` + `z.enum()`. Present on **every released v1 including v1.30.0** (still routed through `normalizeObjectSchema`) |
| [#1699](https://github.com/modelcontextprotocol/typescript-sdk/issues/1699) - Transport closure stack overflow (15-25+ concurrent) | High | Fixed on the **v2 line only** (PR #1788, merged to `main` 2026-04-02); no v1 backport observed | Move to v2, or cap concurrent transport closures on v1 |
| [#1619](https://github.com/modelcontextprotocol/typescript-sdk/issues/1619) - HTTP/2 + SSE Content-Length error | Medium | Closed (reclassified to upstream `@hono/node-server#266`) | Use `enableJsonResponse: true` or avoid HTTP/2 upstream |
| [#893](https://github.com/modelcontextprotocol/typescript-sdk/issues/893) - Dynamic registration after connect blocked | Medium | **Open on both `main` and `v1.x`** - `set*RequestHandlers()` calls `registerCapabilities()` unconditionally, which throws once a transport is attached | Register all tools/resources before `connect()`. If you must register later, register one dummy tool/resource/prompt *before* `connect()` to force handler initialization |
| [#1596](https://github.com/modelcontextprotocol/typescript-sdk/issues/1596) - Plain JSON Schema silently dropped | Fixed | v1.28.0 (now throws at registration) | v1: pass Zod. v2: wrap with `fromJsonSchema()` |
| [#702](https://github.com/modelcontextprotocol/typescript-sdk/issues/702) - `z.transform()` stripped during conversion | Low | Permanent JSON Schema limitation, not a fixable bug | Validate/transform inside the handler, not in the registered schema |
| Client AJV strict rejects unstripped `structuredContent` extras | High | Behavior, not bug | Server `.parse()` upstream data before returning, or use `.passthrough()` |
| GHSA-345p-7cg4-v4c7 / [CVE-2026-25536](https://nvd.nist.gov/vuln/detail/cve-2026-25536) - Shared instances leak cross-client data | Critical | Fixed v1.26.0 | **Require >= v1.26.0** (or v2.0.0-alpha.1+); per-request server+transport |
| [CVE-2026-0621](https://github.com/modelcontextprotocol/typescript-sdk/pull/1365) - UriTemplate ReDoS | Medium | Fixed v1.25.2 / v2.0.0-alpha.1 | Upgrade |

Conversion-level detail for the schema entries (#1643, #1596, #702, AJV strict) lives in `tool-schema-guide.md`. The CVEs and their attack shapes are covered in `security-auth.md`.
