# Publishing to ClawHub

ClawHub ([clawhub.ai](https://clawhub.ai)) is a public registry for Agent Skills. Its own docs now cover most of the surface - read them first:

- [skill-format.md](https://github.com/openclaw/clawhub/blob/main/docs/skill-format.md) - `metadata.openclaw` schema, env-var rules (required vars in `requires.env`, optional in `envVars` with `required: false`), install specs, 50 MB bundle limit, forced MIT-0 license, immutable semver + mutable tags
- [publishing.md](https://github.com/openclaw/clawhub/blob/main/docs/publishing.md) - `clawhub skill publish` flags (`--slug`, `--name`, `--categories`, `--topics`, `--dry-run`, ...) and catalog metadata
- [cli.md](https://github.com/openclaw/clawhub/blob/main/docs/cli.md) - full command surface: `inspect`, `scan`, `delete`/`undelete` (30-day slug hold), `skill rename`/`merge`, `sync`, `token`
- [security-audits.md](https://github.com/openclaw/clawhub/blob/main/docs/security-audits.md) - moderation pipeline (SkillSpector + VirusTotal telemetry + ClawScan risk analysis, worst signal wins), public statuses (Pass / Review / Warn / Malicious / Pending / Error), OWASP Agentic Skills Top 10 lens
- [moderation.md](https://github.com/openclaw/clawhub/blob/main/docs/moderation.md) - appeals and publisher abuse-pressure scoring

Below is only what those docs do not tell you: source-mined constraints and hard-won moderation knowledge. Verified against clawhub CLI v0.23.3, moderation engine v2.4.26, on 2026-08-07.

## Reason Codes: What Fires and How to Fix It

The engine defines exactly 26 reason codes (source of truth: [`convex/lib/moderationReasonCodes.ts`](https://github.com/openclaw/clawhub/blob/main/convex/lib/moderationReasonCodes.ts)). The verdict derives from code prefixes: any `malicious.*` means malicious, any `suspicious.*` means suspicious, only `review.*` means the "Review" tier. The LLM review emits `review.llm_review` - a distinct `review.` tier, not "suspicious". The codes authors actually hit:

| Code | Trigger | Fix |
|---|---|---|
| `review.llm_review` | Metadata-runtime mismatch, capability overreach, internal contradictions | Declare every env/bin/config the body references. Add `homepage`. Resolve flag contradictions (below) |
| `suspicious.exposed_secret_literal` | Long hex (`0x[a-f0-9]{40,}`), JWT-shaped strings, base64 blobs | Placeholders (`<USDC_MAINNET>`) + one canonical address/key reference table |
| `suspicious.destructive_delete_command` | Literal `rm -rf`, even in pedagogical "don't do this" context | Reword ("force-recursive removal") or break the literal with markup |
| `suspicious.potential_exfiltration` | Skill packages user data and sends it off-host | Document the destination and data-handling policy; may be intrinsic to design |
| `suspicious.generated_source_template_injection` | `${VAR}` placeholders in code blocks | Declare those env vars in `metadata.openclaw` - usually a metadata-mismatch echo |
| `suspicious.dangerous_exec` / `suspicious.dynamic_code_execution` | Shelling out to or eval-ing dynamically built code | Call fixed, auditable commands; no runtime code generation |
| `suspicious.obfuscated_code` | Base64/hex-encoded or minified payloads | Ship readable source; never bundle encoded blobs |

Only `suspicious.env_credential_access` is externally self-clearable; every other code requires a fixed re-publish.

**Hard-block codes** (`malicious.install_terminal_payload`, `malicious.crypto_mining`, `malicious.known_blocked_signature`) auto-hide the skill and place the uploader in manual moderation. The most common is `install_terminal_payload`: install instructions telling users to paste obfuscated shell payloads (base64-decoded `curl | bash`). Never include these, even as examples.

## Surviving the LLM Review

ClawScan reviews content coherence - stated purpose vs. actual instructions. Fixes are **always content-side**:

- Declare every env var, binary, and config path the body references in `metadata.openclaw`; undeclared usage is the top mismatch flag
- Defensive scoping language backfires: "this skill does NOT make payments" adds the very trigger words it disclaims. Remove or rephrase; never disclaim
- Don't combine `disable-model-invocation: true` with internal `Agent(model: ...)` overrides in the body - the contradiction triggers high-confidence suspicious (subagents inherit the parent model anyway)
- `always: true` fires `suspicious.privileged_always` unless paired with `homepage` and explicit credential declarations

## Constraints Not in the Prose Docs (Source-Verified)

- GitHub account must be at least 14 days old (`githubAccount.ts`)
- Rate limit: 200 **new** skills per 24 hours; updates to existing skills are uncapped (`skills.rateLimit.test.ts`)
- 10 MB per-file cap inside the 50 MB bundle (`publishLimits.ts`)
- Binaries are accepted (the old text-only upload rule is gone); scanners receive the full artifact
- Slug rules: `^[a-z0-9](?:(?!--)[a-z0-9-])*[a-z0-9]$`, 3-96 chars, plus reserved slugs and protected affixes (`openclaw-*`, `*-official`, `*-verified`, `*-admin`, ...) - source: [`skillSlugValidator.ts`](https://github.com/openclaw/clawhub/blob/main/convex/lib/skillSlugValidator.ts)
- Extra `metadata.openclaw` fields live in the schema but absent from skill-format.md: `links`, `author`, `cliHelp`, `dependencies[]`, `install[].id/label/tap`

## Debugging a Flagged or Blocked Version

```bash
# Owner-visible moderation block (verdict, reasonCodes, engineVersion)
curl -sS -H "Authorization: Bearer $(clawhub token)" \
  https://clawhub.ai/api/v1/skills/<slug> | jq .moderation

# Stored scan report for a blocked/hidden version
clawhub scan download <slug> --version <v>   # ZIP: clawscan, skillspector, static-analysis, virustotal + manifest
```

## Catalog Gotcha for CI Pipelines

Skills published via the reusable CI workflow or `clawhub sync` land in the `other` category - the workflow has no categories input. Pass `--categories`/`--topics` once from the CLI (max 3 categories / 5 topics, fixed slug list) or set them in the web UI. Passing them republishes even unchanged content.
