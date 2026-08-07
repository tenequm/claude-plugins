# Maintaining this skill

Citations across the reference files are `path:line` relative to the `lance-format/lance` repo;
build a permalink as `https://github.com/lance-format/lance/blob/v11.0.0-beta.2/<path>`. Line
numbers drift between tags - treat them as approximate.

To refresh: `git -C <your lance-format/lance clone> fetch --tags`, check out the newest tag
(the major may have jumped again - the release train re-roots on any `breaking-change` label,
and it has now fired on two consecutive lines, so sort tags by date rather than assuming the
current major, and do not assume the previous major ever got a final), then:

1. Re-copy the docs mirror: the `.md` files of `docs/src/{guide,quickstart}`,
   `docs/src/format` (plus the `format/index/*.svg` diagrams), and
   `docs/src/integrations/datafusion.md` into `references/docs/`, preserving the tree.
   Update the directory counts in `SKILL.md` if docs were added or removed. Two deviations from
   upstream bytes are expected and enforced by this repo's pre-commit hooks, not drift: trailing
   whitespace is stripped from every file, and `end-of-file-fixer` removes the trailing blank
   line that `format/table/layout.md` and `format/table/row_id_lineage.md` carry upstream.
   Normalize both before diffing the mirror against a new tag.
2. Re-check Part A of `references/performance.md` against the new `guide/performance.md` and the
   other perf-bearing sections it routes to. Part A deliberately does **not** copy that text -
   it points at `references/docs/`, so a mirror refresh updates it automatically; what needs
   hand-editing is the provenance note (which tags the guide is byte-unchanged across) and the
   two source-derived "Performance changes not in the guide" subsections. Part B (field-verified
   practices) is experience-derived - only edit it with new *measured* results, never
   speculation.
3. Re-verify the crate workspace and re-read the format spec for the reference files
   (`format-file.md`, `format-table.md`, `indexes.md`, `ops.md`, `changelog-v7-v11.md`), then
   bump `metadata.upstream` plus every current-tag version reference. `lance-reference.md` is
   only the section-number index - update it if the split changes.

## Reference file layout

`references/lance-reference.md` maps the original 16 section numbers onto five files:

| Sections | File |
|----------|------|
| 1-4 (what Lance is, crates, file format, data types) | `format-file.md` |
| 5-10 (table format, schema evolution, versioning, row IDs, transactions, MemWAL) | `format-table.md` |
| 11-12 (indexes, distributed write/indexing) | `indexes.md` |
| 13, 15, 16 (object store, capability matrix, source map) | `ops.md` |
| 14 (v7 -> v11 delta) | `changelog-v7-v11.md` |

Cross-references inside those files are written as "section N" against the original numbering,
so the index file must stay in sync with any re-split.
