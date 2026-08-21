# Skill Card

## Description

pre-compact prepares an agent session for context compaction. It writes a dated handoff file that a fresh session with none of the conversation can continue from - position, ordered next steps with paths and commands, decisions with their reasons, verbatim findings, numbered open questions, undone instructions, references - then checks the project's own tracking documents and proposes the updates missing from them. Proposals are applied on approval, or automatically with the `auto` argument.

This skill is ready for commercial and non-commercial use.

## Owner

opwizardx (tenequm/skills, https://github.com/tenequm/skills)

## License/Terms of Use

MIT-0 when installed from ClawHub (registry-wide license for all published skills). Source repository https://github.com/tenequm/skills is licensed Apache-2.0; a LICENSE.txt copy ships in this bundle.

Original work; not derived from another skill.

## Use Case

Anyone who compacts or clears agent context mid-task and loses decisions, findings, or next steps across the boundary. Run it immediately before compacting: the handoff file survives the summary, and the promoted updates land in the documents the project already keeps.

## Deployment Geography for Use

Global

### Requirements / Dependencies

Requires API Key or External Credential: No
Credential Type(s): None

Do not include secrets in prompts, logs, or output; use least-privilege credentials; rotate keys as appropriate.

No external tools, CLIs, or packages. The skill uses whatever file-reading and file-writing tools the host agent already has. It writes into `.agents/compact-handoff/` in the working directory; ignore that path in version control if handoffs should stay local.

## Known Risks and Mitigations

Risk: The handoff becomes a graveyard - state is written there and never promoted into the project's real documents, so the durable docs quietly go stale.

Mitigation: The skill always follows the handoff with a numbered list of promotions into the project's own tracking documents, and reports which files it changed.

Risk: An agent summarizing its own session can restate a number, path, or command inaccurately, and the error then looks authoritative in a file.

Mitigation: The skill requires numbers, commands, paths, and identifiers to be copied verbatim rather than paraphrased, and forbids recording decisions that were not actually made.

Risk: `auto` mode applies every proposed edit without review, which can overwrite or misplace content in curated documents.

Mitigation: `auto` is opt-in per invocation; the default flow stops for approval, accepts a subset of item numbers, and the skill never commits or pushes, so every change stays reviewable in the working tree.

Risk: Handoff files accumulate and may contain sensitive project detail.

Mitigation: Files are dated and human-readable in one directory, so they can be pruned or excluded from version control as a routine step.

## References

- Source: https://github.com/tenequm/skills/tree/main/skills/pre-compact

## Skill Output

Output type(s): A dated Markdown handoff file, a numbered list of proposed document updates, and the resulting edits to the project's tracking documents.

Output format: Markdown file at `.agents/compact-handoff/YYMM-DD-HHMM-<slug>.md`, plus Markdown text in the conversation.

Output parameters: Optional `auto` (or `a`) argument applies every proposed update without asking.

Other properties: Writes files in the working directory. Does not run version-control commands.

## Skill Version

0.1.0

## Ethical Considerations

The handoff captures whatever the session discussed, including any confidential project detail, and stores it as a plain file in the working directory; the usual care about where that file lives and whether it is committed applies. Proposed edits to a project's documents remain the user's decision to accept, and `auto` mode should be reserved for contexts where that review is genuinely unnecessary.
