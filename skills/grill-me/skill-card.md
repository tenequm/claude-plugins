# Skill Card

## Description

grill-me turns the agent into a relentless interviewer that walks down each branch of a plan or design tree, resolving dependencies between decisions one at a time until the user and the agent share the same understanding. It is a procedural prompt for closing the alignment gap before implementation starts.

This skill is ready for commercial and non-commercial use.

## Owner

opwizardx (tenequm/skills, https://github.com/tenequm/skills)

## License/Terms of Use

MIT-0 when installed from ClawHub (registry-wide license for all published skills). Source repository https://github.com/tenequm/skills is licensed Apache-2.0; a LICENSE.txt copy ships in this bundle.

The instructional text is derived, near-verbatim, from the `grill-me` skill in https://github.com/mattpocock/skills at commit 62f43a1 (April 2026), Copyright (c) 2026 Matt Pocock, licensed MIT. The full MIT notice is reproduced in the LICENSE.txt shipped with this bundle.

This is a deliberate fork of that April 2026 version, not a mirror that tracks upstream: mattpocock has since replaced his `grill-me` with a thin shim that delegates to a separate `grilling` skill, while this version keeps the original standalone behavior. It will not follow upstream changes.

## Use Case

Anyone about to hand an agent a plan, spec, or design and wanting to surface the unstated decisions first. The agent asks one question at a time with its recommended answer attached, waits for feedback before continuing, and explores the codebase itself whenever a question is answerable from the code instead of from the user.

## Deployment Geography for Use

Global

### Requirements / Dependencies

Requires API Key or External Credential: No
Credential Type(s): None

Do not include secrets in prompts, logs, or output; use least-privilege credentials; rotate keys as appropriate.

No external tools, CLIs, or packages; the skill is pure instructions to the agent. The codebase-exploration step uses whatever file-reading and search tools the host agent already has.

## Known Risks and Mitigations

Risk: The agent supplies a recommended answer with every question, which can anchor the user into accepting a default they would otherwise have questioned.

Mitigation: Recommendations are explicitly the agent's suggestion, not a decision; users should treat each one as a starting point and push back where their context differs.

Risk: A long interview can drift into questions that do not affect the outcome, burning the user's time and context budget.

Mitigation: The one-question-at-a-time cadence means the user can end the session at any point once the decisions that matter are resolved.

Risk: Codebase exploration substitutes the agent's reading of the code for the user's intent, and the code may not reflect what the user wants next.

Mitigation: The skill routes only questions genuinely answerable from the codebase to exploration; intent questions still go to the user.

## References

- Source: https://github.com/tenequm/skills/tree/main/skills/grill-me
- Derived from: https://github.com/mattpocock/skills/blob/62f43a1/skills/productivity/grill-me/SKILL.md (MIT, Copyright (c) 2026 Matt Pocock)
- Current upstream, for comparison: https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md

## Skill Output

Output type(s): A sequence of one-at-a-time interview questions with recommended answers, converging on a shared understanding of the plan.

Output format: Markdown text in the conversation.

Output parameters: Not applicable

Other properties: Interactive and multi-turn by design; it produces alignment, not a written artifact, and does not modify files.

## Skill Version

0.1.1

## Ethical Considerations

The interview format asks the user to disclose plan and design detail; where that detail is confidential, the usual care about what is sent to a model provider applies. Decisions reached during the session are the user's own and warrant normal review before being acted on.
