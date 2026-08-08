# Skill Card

## Description

ghostwriter inverts the usual writing request: instead of drafting on the user's behalf, the agent interviews the user one question at a time, then assembles the finished piece out of the user's own answers. It is a procedural prompt for producing writing that carries the user's voice and facts rather than model-generated filler.

This skill is ready for commercial and non-commercial use.

## Owner

opwizardx (tenequm/skills, https://github.com/tenequm/skills)

## License/Terms of Use

MIT-0 when installed from ClawHub (registry-wide license for all published skills). Source repository https://github.com/tenequm/skills is licensed Apache-2.0; a LICENSE.txt copy ships in this bundle.

## Use Case

Anyone who needs to write for an audience - a blog post, launch announcement, README, internal memo, talk abstract - and wants the result to sound like them. The agent optionally scouts context about the subject and destination, then runs a one-question-at-a-time interview, refusing generic answers, and stops when it has enough material. It then reorders, cuts, and tightens the user's own words rather than inventing sentences.

## Deployment Geography for Use

Global

### Requirements / Dependencies

Requires API Key or External Credential: No
Credential Type(s): None

Do not include secrets in prompts, logs, or output; use least-privilege credentials; rotate keys as appropriate.

No external tools, CLIs, or packages; the skill is pure instructions to the agent. The optional scouting step may use whatever search or file-reading tools the host agent already has.

## Known Risks and Mitigations

Risk: The assembled piece may still contain connective phrasing the user never said, blurring the line between their words and the agent's.

Mitigation: The skill instructs the agent to ask for a missing line rather than invent it; users should read the assembled draft against their own answers before publishing.

Risk: An interview that stops too early produces a thin piece, and the agent is the one judging sufficiency.

Mitigation: The skill has the agent propose stopping rather than stopping unilaterally, leaving the call with the user, who can keep answering.

Risk: The optional context-scouting step can pull in inaccurate third-party material about the subject.

Mitigation: Scouting is opt-in and asked about up front; the assembly stage is still constrained to the user's answers, not the scouted material.

## References

- Source: https://github.com/tenequm/skills/tree/main/skills/ghostwriter

## Skill Output

Output type(s): A sequence of interview questions, followed by a finished piece of writing assembled from the user's answers.

Output format: Markdown text in the conversation.

Output parameters: Not applicable

Other properties: Interactive and multi-turn by design; it blocks on user answers and will not produce the piece from a single prompt.

## Skill Version

0.1.0

## Ethical Considerations

The output is written to read as the user's own work, which is the point of ghostwriting - users are responsible for disclosing authorship where their context requires it. Because the agent may still supply connective phrasing, the user should verify that every factual claim in the assembled piece is one they actually made and stand behind.
