---
name: pre-compact
description: Prepare the session for context compaction - write a handoff file a fresh session can continue from, propose updates to the project's durable docs, apply them on approval or with `auto`. Use before compacting or clearing context, or on "pre-compact".
metadata:
  version: "0.1.0"
  openclaw:
    homepage: https://github.com/tenequm/skills/tree/main/skills/pre-compact
    emoji: "🧳"
disable-model-invocation: true
argument-hint: "[auto|a]"
---

I am about to compact this context. The summary will be lossy and sometimes
wrong, so files are the source of truth: get everything a fresh session would
need out of the conversation and into them. Mode: $ARGUMENTS (`auto` or `a` =
apply every proposed update without asking).

Write `.agents/compact-handoff/YYMM-DD-HHMM-<short-slug>.md` with: where we
are and why, ordered next steps with the paths, commands and identifiers
needed to execute them, decisions made here with their reasons, findings
verbatim, open questions numbered with your recommended answer, instructions
of mine still undone, and references. Copy numbers, commands and paths
exactly - never paraphrase. Record only decisions that were actually made;
leave open questions open.

Then check the docs this project uses to track work (plans, journals, status
sections, task lists): for each thing in the handoff, is it already recorded
there, and is it current? Don't ask what the repo can answer. List, numbered,
what is missing or stale: file, what changes, one line each. Reply options: y
to apply all, n to apply none, item numbers to apply some, or tell me what to
change. Wait for my answer unless in auto mode. Never commit or push.

Finish with one line: READY, the handoff path, and the files you changed.
