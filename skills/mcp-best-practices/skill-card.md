# Skill Card

## Description

mcp-best-practices is a decision reference for building, securing, and optimizing production MCP servers with the TypeScript SDK (spec 2026-07-28, SDK v2.0.0 stable / v1.30 legacy) for developers who already have a working server and need it correct, fast, and secure.

This skill is ready for commercial and non-commercial use.

## Owner

opwizardx (tenequm/skills, https://github.com/tenequm/skills)

## License/Terms of Use

MIT-0 when installed from ClawHub (registry-wide license for all published skills). Source repository https://github.com/tenequm/skills is licensed Apache-2.0; a LICENSE.txt copy ships in this bundle.

## Use Case

Developers building or reviewing MCP servers who need authoritative answers on transports, tool and schema design, error handling, OAuth 2.1 security, performance and token budgets, known SDK bugs, content vs structuredContent delivery, v2 migration, MCP Apps, extensions, and the Registry.

## Deployment Geography for Use

Global

### Requirements / Dependencies

Requires API Key or External Credential: No
Credential Type(s): None (the skill itself needs no credentials; servers built from its guidance typically implement OAuth 2.1 with their own credentials)

Environment variables referenced in guidance (declared in metadata.openclaw envVars, all optional): MAX_MCP_OUTPUT_TOKENS - Claude Code client-side cap on MCP tool result size.

Do not include secrets in prompts, logs, or output; use least-privilege credentials; rotate keys as appropriate.

Dependencies referenced in the guidance (for the code the agent writes, not for the skill):
- @modelcontextprotocol/server / /client / /core (v2.0.0, current) or @modelcontextprotocol/sdk (v1.30.0, legacy line)
- zod >=4.2.0 (or any Standard Schema library) for schema definitions
- Optional framework integrations: Hono, Express, Fastify, Node, Cloudflare Workers
- MCP Inspector and @modelcontextprotocol/conformance for testing

## Known Risks and Mitigations

Risk: The MCP spec and TypeScript SDK are evolving fast (spec 2026-07-28 released 2026-07-28, SDK v2.0.0 released 2026-07-27); guidance pinned to specific versions can go stale and lead to code targeting removed features (SSE transport, protocol sessions, Roots/Sampling/Logging, core Tasks).

Mitigation: The skill pins exact versions in metadata.upstream (including the spec revision), dates its claims, separates the released 2026-07-28 revision from the 2025-era wire that deployed software still speaks, and carries a dedicated references/spec-2026-07-28.md; users should verify against the linked official spec and changelog when versions move.

Risk: Security guidance (OAuth 2.1, token audience validation, session handling, the Lethal Trifecta) could be applied incompletely, leaving a server exploitable while appearing to follow best practices.

Mitigation: The skill cites normative spec requirements and real CVEs with minimum SDK versions (require >= v1.26.0), and directs users to tested auth libraries instead of hand-rolled validation; security-sensitive servers should still get independent review.

Risk: Code examples copied verbatim (stateless transport pattern, tool registration) may not fit a project's runtime and could fail subtly, e.g. shared server instances leaking cross-client data.

Mitigation: Examples encode the maintainer-confirmed per-request pattern and flag the exact failure mode (CVE-2026-25536); users should test with MCP Inspector before deploying.

## References

- Upstream: https://github.com/modelcontextprotocol/typescript-sdk (pinned @modelcontextprotocol/sdk@1.30.0, @modelcontextprotocol/server@2.0.0, @modelcontextprotocol/ext-apps@1.7.5, modelcontextprotocol-spec@2026-07-28)
- MCP specification: https://modelcontextprotocol.io/specification/latest
- SDK docs: https://ts.sdk.modelcontextprotocol.io
- Source: https://github.com/tenequm/skills/tree/main/skills/mcp-best-practices

## Skill Output

Output type(s): Guidance text and TypeScript code (server setup, tool registration, error handling, auth patterns)

Output format: Markdown analysis and TypeScript code snippets

Output parameters: Not applicable

Other properties: Reference-only skill; it executes nothing itself. Includes references/ deep dives on transports, schemas, errors, security/auth, v2 migration, MCP Apps, extensions/registry, and the released 2026-07-28 spec revision.

## Skill Version

1.0.0

## Ethical Considerations

MCP servers built from this guidance mediate model access to data and side effects; builders should honor the skill's security sections (least privilege, audience-bound tokens, avoiding the Lethal Trifecta) rather than cherry-picking convenience patterns. Human review is expected for any auth or destructive-tool code before production.
