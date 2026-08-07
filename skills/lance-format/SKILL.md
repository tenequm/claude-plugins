---
name: lance-format
description: Deep reference for Lance v11 - the open columnar lakehouse format for multimodal AI - and its Rust crate workspace plus pylance. Covers the 2.x file format and structural encodings, the table format (manifests, fragments, transactions, OCC), vector / scalar / full-text indexes, MemWAL, schema evolution, time travel, namespaces, and object-store config. Use when building directly on the Lance crates or reading `.lance` datasets; this is the Lance format and engine (`lance-format/lance`), not the LanceDB product built on top of it.
metadata:
  version: "0.14.0"
  upstream: "lance-format/lance@v11.0.0-beta.2"
  openclaw:
    homepage: https://github.com/tenequm/skills/tree/main/skills/lance-format
    emoji: "🗄️"
---

# Lance v11 reference

Lance is an open columnar format for multimodal AI - "a columnar data format that is 100x
faster than Parquet for random access." It is not one format but a stack of interoperating
specs: a **file format**, a **table format**, **index formats**, **catalog specs**, and a
**namespace client spec**. The Rust workspace at `lance-format/lance` implements all of them
plus Python (`pylance`) and Java bindings.

This skill tracks **`v11.0.0-beta.2`** (the `lance-format/lance` git tag), the current
development frontier; **`v9.0.1`** is the stable pin. Pin against tags, not `main` - Lance ships
beta tags every few days and `next`-format encodings can change. Version landscape below.

Three layers of reference, load what the task needs:

- **The deep reference** - any concrete schema, parameter, proto, or constraint. Split by topic:

  | File in `references/` | Covers | Sections |
  |------|--------|----------|
  | `format-file.md` | What Lance is, the 26 crates, file format, data types | 1-4 |
  | `format-table.md` | Dataset layout, manifests, fragments, schema evolution, versioning/tags/branches, row IDs, transactions + OCC, MemWAL | 5-10 |
  | `indexes.md` | Vector / scalar / FTS / geo indexes, distributed builds | 11-12 |
  | `ops.md` | Object store, capability matrix, source map | 13, 15, 16 |
  | `changelog-v7-v11.md` | The full v7 -> v11 delta | 14 |

  Cross-references written as "section N" resolve through `references/lance-reference.md`.
- `references/performance.md` - ALL performance guidance. Part A routes to the official text and
  adds the source-derived changes upstream has not documented; Part B is field-verified
  remote-storage practice. Load for any performance, tuning, maintenance-cost, or "why is this
  slow" question.
- `references/docs/` - a **verbatim mirror of the official docs** (`docs/src` at the tracked
  tag): every guide, quickstart, and format spec, unedited. Load when you need the full official
  text. Directory map below.

`references/maintenance.md` covers refreshing this skill against a new upstream tag.

## Lance vs LanceDB

These are two different things and conflating them produces wrong answers.

- **Lance** - the format and engine. The `lance-format/lance` repo; the `lance` /`lance-*`
  Rust crates; `pylance`. It gives you datasets, the file/table format, indexes, commits,
  scans. Consumed directly by DuckDB, Polars, Ray, Spark, PyTorch, DataFusion, or your own
  Rust/Python code. **This skill is about Lance.**
- **LanceDB** - a separate database *product* (`lancedb/lancedb`) built on top of Lance. It
  adds a query-builder API, an embedding registry, rerankers-as-API, multi-language SDK
  parity, and managed Cloud / Enterprise tiers. Not covered here.

**The wider ecosystem** (separate repos, own version lines, none covered here): Flink streaming
writes (`lance-flink`), PostgreSQL reads via `pglance`, a Cypher graph engine (`lance-graph`), a
dataset browser (`lance-data-viewer`), agentic context management (`lance-context`), and
namespace catalog implementations for Hive, Polaris, Gravitino, Unity Catalog, and AWS Glue.

If you are linking the `lance` crate in `Cargo.toml`, you are using Lance directly - use this
skill. If a question is about LanceDB internals, the storage layer underneath it is still
Lance, so this skill remains the authority for the format itself.

## The crate workspace

26 crate directories under `rust/`. **`lance` is the public entry point** - `Dataset`, scanner,
indexes, commits; everything else (`lance-table`, `lance-file`, `lance-encoding`, `lance-index`,
`lance-io`, `lance-core`, `lance-datafusion`, `lance-linalg`, `lance-namespace*`, ...) is a layer
beneath it. Edition 2024, MSRV 1.91.0, arrow 58, datafusion 54; Python bindings need 3.10+. Full
table with roles, versions, and every workspace dep in `references/format-file.md` section 2.

**If you depend on anything below `lance`, v11 will break you** - PRs #8020-#8026 deleted
`lance-encoding::version` with no re-export (`LanceFileVersion` and `ConcreteFileVersion` both
live in `lance-file::version` now), removed `lance_io::encodings` and the `previous` namespaces,
and gave each current format its own `versions/v2_{0,1,2,3}` module. Section 2.1.

## File format versions

The file format carries a single major.minor version. Selected per-dataset at creation via
`data_storage_version` and **fixed once the dataset exists** (to change it, rewrite the
dataset).

| Version | Status | Notes |
|---------|--------|-------|
| `0.1` (`legacy`) | read-only | Original format; no longer writable |
| `2.0` | stable | Removed row groups; null support for lists/FSL/primitives |
| `2.1` | **current default** (`stable`) | Adaptive structural encodings; better integer/string compression; nulls in struct fields; better nested random access. Default since Lance 5.0.0 |
| `2.2` | unstable | Map type, Blob v2, `VariablePackedStruct`, larger mini-blocks. Required for Map and Blob v2; the real experimental frontier - encodings may still change |
| `2.3` | unstable (`next`) | The current `next` alias target (`V2_3` in the enum). Ships **sparse structural pages**, which the 2.3 writer now auto-selects under a rep/def budget heuristic |

`stable` resolves to the default (2.1); **`next` now resolves to 2.3, not 2.2** - pin an
explicit number for deterministic behavior. In the version ladder 2.2 sits *below* `next`, so
the code does not flag 2.2 as unstable even though the docs version table lists only 2.3 as the
unstable row. The release *selectors* (`LanceFileVersion`) are a type distinct from the
persisted identity (`ConcreteFileVersion`). Details, plus the sparse auto-selection rules, in
`references/format-file.md` sections 3.1 and 3.6.

## Version landscape

The major is bumped by a bot, not a human: `ci/publish_beta.sh` re-roots at `MAJOR+1` whenever
any PR since the release root carries the GitHub `breaking-change` label - the marker is the
**label**, not a conventional-commit `!`. A major bump therefore means "some labeled breaking
change landed", not a redesign. It has fired on two consecutive lines, which is why **neither
`v9.1.0` nor `v10.1.0` was ever released**; **`v10.0.0` final was never tagged either** (that
line stopped at `v10.0.0-rc.3`, on a stabilization branch that is not an ancestor of `main`).

| Major | Its breaking theme |
|-------|--------------------|
| **v11** (current, `v11.0.0-beta.2`) | Fragment ids became a dataset-lifetime high-water mark; large internal reorganization of `lance-file` / `lance-encoding`. Delta below |
| **v10** | Blob APIs preserve null selections; cache keys became opaque BLAKE3 digests (every warm or persisted cache cold-misses, no legacy fallback); async `create_remapper`; MemWAL renamed generation -> SSTable, merge -> compaction (wire-compatible, symbol-breaking) |
| **v9.1** (never released; renamed into v10) | FTS/inverted creation took a `block_size` param. Net-new: Data Overlay Files (cell-level updates without base-file rewrite, unstable + env-gated), sparse structural pages, `lance-index-core` |
| **v9** | Python 3.9 dropped; `alter_columns` fails fast when casting an indexed column; FM-Index proto rename made existing FM indexes unreadable; FTS/inverted defaults to on-disk format v2 |
| **v8** | All index builds unified onto one segment-based lifecycle. Net-new: `lance-derive`, FM-Index, multi-bit IVF_RQ, public `approx_mode`, TOS + GooseFS object stores |
| **v7** | MemWAL, branches, the geo/RTree index, the `lance-select` crate, ICU FTS |

**`v9.0.1` is the stable pin** (2026-08-06, superseding `v9.0.0`). crates.io carries **finals
only** (newest is `lance 9.0.1`; no 10.x or 11.x, and no pre-release of any kind), so a beta pin
means a git dependency - beta artifacts publish to fury.io instead.

Full per-tag deltas, with every PR citation: `references/changelog-v7-v11.md`.

## The v11 delta

128 commits from `v10.0.0-beta.7`, with **nine `breaking-change`-labeled PRs**. The structural
invariants all held: **26 crates**, **16 transaction ops**, `CommitConfig.num_retries` **20**,
file-format enum still `next => 2.3` / default 2.1 (no 2.4), arrow 58 / datafusion 54, MSRV
1.91.0, manifest feature flags unchanged.

**Breaking:**

- **Fragment ids are now a dataset-lifetime high-water mark** (#8206) - the sharpest change,
  because it is a *format* invariant, not just an API. Overwrite no longer restarts ids at 0, so
  "an id must never name two different sets of rows". An overwrite fragment carrying a deletion
  file is now rejected (that file's path embeds the old id), and **any** commit producing
  duplicate ids is rejected - datasets written by Lance 0.16 and earlier may already contain
  duplicates: still readable, no longer committable. `dataset.get_fragment(0)` after an overwrite
  must read ids from the manifest instead.
- **The file-version types and the whole reader/writer composition moved** (#8020-#8026) - see
  the crate-workspace note above. `FileWriter` became an **enum** with all constructors removed;
  `FileReader::version()` returns `ConcreteFileVersion`. Only two of these carry a `!` in the
  commit subject; the rest break silently at compile time. Section 3.6.
- **`DataBlockBuilder::append` is fallible** (#8172) - malformed variable-width offsets yield
  `Error::CorruptFile`, so some files that previously "read" now error. **HNSW construction
  changed** (#8188) - `m < 4` rejected, persisted level layout corrected; expect different graphs
  and different recall. `MemWalIndex::force_seal_active` returns `SealFence` (#8051);
  `MiniBlockCompressor::compress` takes a context parameter (#8038), breaking out-of-tree codecs
  but not persisted bytes; `CacheBackend::deep_size_of_entries` (#8159) makes reported cache
  sizes **shrink**, so anything budgeting against `LanceCache::deep_size_of()` sees new numbers.

**Net-new:**

- **FTS gained a document-boundary axis** (#7788) - `DocumentGranularity` (`ROW` /
  `LIST_ELEMENT`), a `posting_format_version` distinct from `index_version`, a `_doc_index`
  column. `document_granularity="list_element"` is a **third** trigger requiring FTS on-disk
  format v3, independent of `block_size=256` and the code-analyzer tokenizer. Section 11.3.
- **Large transactions spill out of the manifest** (#7881) - above `MAX_INLINE_TRANSACTION_BYTES`
  (**20 MiB** in release builds; the 64 KiB figure in the PR text is test-only) the transaction
  lives solely in its external file. Measured: a full-commit manifest shrank 1576 MiB -> ~790 MiB.
  No new configuration.
- A posting-backed compound FTS scoring core (#8092-#8094, #8131, #8299) - every clause combined
  with `AND` is a scoring `MUST` clause, so all must match **and every matching clause
  contributes to `_score`**; exact-null zone maps over every type (#8088, #8017); pluggable cache
  backends (#7683); the `aws_provider_scheme` storage option (#8103); `goosefs://` on
  `ConditionalPutCommitHandler` (#8134 - if-not-exists only holds once *every* writer is
  upgraded); multipart uploads keeping part identity across retries (#8174). **No new `LANCE_*`
  env vars landed in v11.**

Full delta including the Python/Java surface: `references/changelog-v7-v11.md`.

## Performance questions

For anything performance-shaped - slow scans or searches, remote/object-storage cost, index
maintenance cost, memory sizing, version bloat, benchmarking - load
`references/performance.md` first. Part A routes to every official performance recommendation
plus the undocumented source-derived changes; Part B is field-verified practice from running
Lance against S3-compatible storage, whose governing rule is: **leave the store knobs
(`LANCE_IO_THREADS`, `LANCE_AIMD_*`, timeouts, compression metadata) at their defaults and
optimize by minimizing remote calls** - fewer commits, fewer scans, fewer round trips.

## Official docs mirror

`references/docs/` mirrors `docs/src` of `lance-format/lance` at the tracked tag, verbatim -
45 markdown files plus 4 diagrams, every one directly readable.

| Directory | Files | Covers |
|-----------|-------|--------|
| `guide/` | 14 | CRUD, performance, object store, distributed write + indexing, JSON, tokenizers, data types, data evolution, blob, arrays, tags/branches, migration, observability |
| `quickstart/` | 4 | First dataset, vector search, full-text search, versioning |
| `format/` | 1 | Spec-stack overview |
| `format/file/` | 3 | Container spec, structural encodings + compression, format versions |
| `format/table/` | 9 | Layout, schema, transactions (**conflict-resolution matrix**), versioning, row-id lineage, branch/tag, MemWAL, data overlay files |
| `format/index/` | 1 + 4 svg | Index lifecycle, fragment coverage, compaction interplay |
| `format/index/scalar/` | 9 | fts, fmindex, ngram, btree, bitmap, bloom_filter, label_list, zonemap, rtree |
| `format/index/vector/` | 1 | IVF / PQ / SQ / RQ / HNSW concepts and storage layout |
| `format/index/system/` | 2 | Fragment reuse index, MemWAL system index |
| `integrations/` | 1 | DataFusion SQL over Lance, incl. JSON functions |

**Not mirrored:** `docs/src/images/` (the PNG/GIF diagram assets). Image links inside the
mirrored pages therefore do not resolve - the surrounding prose is self-contained, and the four
index-lifecycle `.drawio.svg` diagrams under `format/index/` *are* mirrored. Also outside the
mirror by design: the `community/`, `examples/`, and `integrations/{pytorch,tensorflow}` pages;
the landing/index stubs (`index.md`, `sdk_docs.md`, `integrations/index.md`) and the
contributor files (`format/AGENTS.md`, `format/CLAUDE.md`); and the published-site sections
(`format/catalog`, `format/namespace`, and the Spark / Ray / Trino / DuckDB / HuggingFace
integrations) that are assembled at build time from sibling repos with their own version lines.
