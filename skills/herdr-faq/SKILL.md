---
name: herdr-faq
description: Launch and drive coding agents (codex, claude, agy) through the Herdr CLI reliably. Use before starting or prompting a subagent via herdr agent/pane commands, and when any herdr command fails or an agent seems stuck, silently lost a prompt, or reports a wrong state.
metadata:
  version: "0.1.0"
  categories: "agents, operations"
  topics: "herdr, troubleshooting, agent-orchestration, terminal-multiplexer"
  upstream: "herdr@0.8.2"
  openclaw:
    homepage: https://github.com/tenequm/skills/tree/main/skills/herdr-faq
    emoji: "🐑"
---

# Herdr FAQ

Launch and drive coding agents through [Herdr](https://herdr.dev) (>= 0.8.2) without losing prompts. Command semantics: `herdr --skill`; this file covers only what goes wrong and the recipes that avoid it.

## Invariants

1. **Exit 0 means queued, never delivered.** Confirm by effect: state moved, or the text is visible in the pane.
2. **Screens no detection rule matches read as `idle`.** Claude's trust dialog and everything agy shows can report "ready" while a dialog eats your prompt. Read the screen before the first prompt, always.
3. **`agent start` timeout = the child never launched** (bad flag, PATH, wrapper process). The pane has the real error; herdr's message never does.
4. **The driving harness is a second gate**: dangerous passthrough flags (`--dangerously-*`, `danger-full-access`) get classifier-blocked; `sleep N; herdr ...` polling is banned - use one backgrounded `prompt --wait`.

## Launch

```bash
test "${HERDR_ENV:-}" = 1                       # never drive herdr from outside a pane

P=$(herdr pane split --current --direction right --cwd "$PWD" --no-focus | jq -r .result.pane.pane_id)
test -n "$P"                                    # empty $P => misleading downstream errors
herdr pane process-info --pane "$P"             # must be a bare shell at its prompt

herdr agent start worker --kind codex --pane "$P" --timeout 90000 -- --approve-for-me --no-alt-screen

# If agent_not_ready (dialog on screen): read it, answer deliberately, wait
herdr agent read worker --source detection --lines 40
herdr agent send-keys worker enter && herdr agent wait worker --timeout 60000

herdr agent read worker --source detection --lines 40   # ALWAYS before first prompt (invariant 2)
```

Rules: capture every ID from JSON, never predict. Env vars via `--env KEY=VALUE` at pane/tab/workspace creation, never `pane run 'export ...'`. Names: `[a-z][a-z0-9_-]{0,31}`, namespaced (`myproj-reviewer`, never `driver`); names die with the agent - re-attach via `agent rename <pane> <name>`. `--timeout` >3000, <=300000 (default 30000). Fleets get their own workspace, `--no-focus` everywhere. After a killed `agent start`, run `herdr agent get <name>` once to free the name reservation.

### Per kind

**codex** - `-- --approve-for-me --no-alt-screen` (never `--full-auto`: removed in 0.15x, surfaces as bare timeout). Trust dialog IS detected: untrusted dir fails fast with `agent_not_ready` - recover as above. The one-time post-`integration install` hooks-review gate is NOT detected (WONTFIX): the first pane per machine reports ready and eats its first prompt - answer it once. Session ref binds only at the first prompt: send a trivial one before relying on restore. Resume: `codex resume <id>`.

**claude** (alias `claude-code`) - `-- --model <m>`. Trust dialog NOT detected: start *succeeds* on an untrusted dir and the first prompt types into the dialog - pre-trust the dir or read-then-`send-keys` (e.g. `down enter`). A Claude Code UI update can silently break detection (idle mid-turn, false `agent_prompt_stalled`): `herdr server update-agent-manifests`. A background shell in a turn hangs waits (`working` forever; fix unreleased) - use a report-file sentinel. Native-launcher installs run under a version-string process herdr can't identify (start times out, `launch_pending:true`): launch via `HERDR_AGENT=claude exec <path>`, then rename. Resume: `claude --resume <id>`.

**agy** (aliases `antigravity`, `antigravity-cli`) - thinnest detection: no idle rule at all, every `idle` is a guess; the trust dialog reads idle; premature `done` mid-turn up to ~50s. Never trust a single settled state - verify by screen read or sentinel. No session ref until the first prompt. Integration install target is `antigravity-cli`; config dir `~/.gemini/config` must exist.

Integrations for all three are session-restore only - they never improve state detection - and their hooks silently no-op without `python3` on PATH.

## Drive

```bash
# One call, generous timeout, backgrounded. Never bare `agent prompt`, never prompt-then-wait.
herdr agent prompt worker "$(cat brief.md)" --wait --timeout 1800000

# On timeout: usually false - confirm before acting, never blind-resend
herdr agent get worker                                   # working = still on the turn

# Mid-turn dialogs: wait for blocked, inspect, surface to the human, answer via send-keys
herdr agent wait worker --until blocked --timeout 120000
herdr agent read worker --source detection --lines 40

# Output: recent-unwrapped, fall back to visible if empty (fresh panes return 0 bytes from recent)
herdr agent read worker --source recent-unwrapped --lines 120

# Exit: confirm positively - shell back in foreground. Never regex the prompt.
herdr pane process-info --pane "$P" && herdr pane close "$P"
```

- Keep `--until` at its default (`idle|done|blocked`) - narrowing it is how waits hang. A wait ending `agent_not_running` after exit/move is the event, not an error.
- Long turns and fleets: end every brief with "write your full report to `<path>` and reply with only the path" - the file appearing is the reliable completion signal (lifecycle waits settle on transient idles), and it sidesteps alternate-screen reads.
- Long text never goes in argv or keystrokes - the kernel tty silently truncates at 1024 bytes (macOS) / 4096 (Linux). Pass file paths.
- `send-keys` = key names (`enter`, `esc`, `down`, `ctrl+c`); text and slash commands = `prompt`. Slash commands that open dialogs trip the fixed 5s `agent_prompt_stalled` gate - verify those by screen read, not `--wait`.
- Queue follow-ups behind a working agent freely; `agent prompt` refuses blocked agents (`agent_blocked`) before writing anything.
- Gate decisions on `agent_status`, never `interactive_ready` (stays true while blocked).

## Failures

Triage first:

- Any start failure -> `herdr pane process-info --pane <id>`: foreign foreground process = busy/race (below); only the shell yet it timed out = profile still loading or an invisible nested shell (Windows); agent under a wrapper (`node`, a bare version string) = herdr can't identify it -> relaunch via `HERDR_AGENT=<kind> exec <cmd>` (or `exec -a <kind>`), then `agent rename`.
- Any wrong state -> `herdr agent explain <target> --verbose` + `agent read --source detection`. Matched rule null + `default_known_agent_idle_fallback` = herdr is guessing. Stale manifest -> `herdr server update-agent-manifests` (no restart needed). Local rule patch: `~/.config/herdr/agent-detection/<kind>.toml`.
- Logs: `~/.config/herdr/herdr-server.log`, `HERDR_LOG=herdr=debug`. After a binary update: `herdr server stop` + relaunch (old server keeps serving; stop kills pane processes) and `herdr integration status --outdated-only`.

**`agent_not_ready` (start)** - a dialog is on screen. Exit 1 but the agent is running and the name is bound (documented contract). Read, answer via send-keys, wait, prompt. A blocked launch never times out: `launch_pending` stays true and `rename` returns `agent_launch_pending` until the dialog is answered or the process exits. On `agent prompt` the same code means launch pending or the agent left the foreground.

**`timeout` (start)** - invariant 3; read the pane. `command not found` in a non-login shell: set `[terminal] shell_mode = "login"`, recreate the pane. Windows npm-shim installs fail only when `--` args are passed: `pane run "<cmd with flags>"`, wait, `agent rename`.

**`agent_name_taken` / `agent_launch_pending`** - reservations are made before launch and reconciled lazily: `herdr agent get <name>` once frees an expired one. Still wedged (rename -> pending, get -> not_found, restart -> pane_busy): burn both - fresh pane, fresh name. Names are cross-workspace and freed names get recycled - namespace them.

**`agent_pane_busy`** - "available shell" = the shell itself, alone, in the foreground. Three cases: (a) racy - shell still running its rc files (`starship`, `direnv` etc.); herdr retries only 2s (never on Windows) and `pane get` looks identical ready vs not, so retry with backoff and clean up the tab a failed attempt orphaned; (b) genuine occupant - split a new pane, don't reclaim (killing the occupant cascades into `pane_not_found`); (c) permanent on Windows - a profile that chain-launches pwsh nests shells invisibly: `[terminal] default_shell = "pwsh.exe"`, reload config, recreate panes.

**`agent_not_found`** - downstream symptom: failed start, exited agent, or a bad name earlier in the loop. A pane holding only a shell also returns it (not `pane_not_found`). A live pane can rarely lose registration while the TUI runs fine - `agent rename <pane> <same-name>` restores it.

**`timeout` (prompt --wait / wait)** - usually the turn outlasted the timeout: `agent get` shows `working`. Use 1800000+, background it, never resend on timeout alone. `--timeout <= 5000` reports this code instead of `agent_prompt_stalled`.

**`agent_prompt_stalled`** - the 5s gate is fixed. Causes in observed order: stale manifest; dialog-opening prompt; a target-side paste modal swallowing Enter (omp's Large Paste Menu - disable it in omp `/settings`, or pass a file path); Windows input races on long prompts. Never blind-resend and never recover with a lone `send-keys enter` (it can silently no-op). Read the pane: text sitting in the composer -> one `enter`; text absent -> re-prompt. Verify pattern:

```bash
for i in 1 2 3; do
  herdr agent prompt "$A" "$TEXT" --wait --timeout 60000 && break
  herdr agent read "$A" --source recent-unwrapped --lines 200 | grep -qF "${TEXT:0:80}" && break
done
```

**`agent_blocked` (prompt)** - refused before anything is written. Read detection, surface the dialog, answer via send-keys. Stale scrollback `[y/n]` text can also classify codex as blocked - update manifests.

**`invalid_agent_name`** - grammar above; shell loops producing uppercase are the classic cause, and one bad name cascades into a wall of `agent_not_found`s.

**`pane_not_found` / `workspace_not_found` / `unknown option: <valid-looking value>`** - IDs are runtime-only, never reused: re-list (`workspace list`, `agent list`) at session start, recreate only what's missing. Closing the last tab closes its workspace. An empty `$P` makes the CLI parser blame the wrong token.

**`invalid_key` / flag errors** - `send-keys` takes key names only. `workspace create` takes `--label`, not `--name`. Bad flags print usage on stderr and exit 2, so `herdr ... | jq` dies with a misleading parse error - check exit status before parsing.

**Harness blocks** - classifier denial on dangerous passthrough flags: put permissiveness in the child agent's own config ("Stage 2 classifier error" is transient - retry once). Allowlist read-only commands (`agent get/read/list/wait/explain`, `pane read/list/process-info`, `workspace list`) or every call prompts.

Silent failures (exit 0, no error): fallback-idle prompt swallowing (invariant 2); bare `agent prompt` leaving text unsubmitted in an out-of-view pane; tty truncation of long lines; a first turn going straight `unknown -> working -> idle` skips `done` and its notification; detection sees only the last ~24 rows, so a tall dialog in a short pane is partly invisible; `pane wait-output` matches the echoed command itself - never use it for readiness.
