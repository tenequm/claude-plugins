---
name: lance-format
description: Deep reference for Lance v11 - the open columnar lakehouse format for multimodal AI - and its Rust crate workspace plus pylance. Covers the 2.x file format and structural encodings, the table format (manifests, fragments, transactions, OCC), vector / scalar / full-text indexes, MemWAL, schema evolution, time travel, namespaces, and object-store config. Use when building directly on the Lance crates or reading `.lance` datasets; this is the Lance format and engine (`lance-format/lance`), not the LanceDB product built on top of it.
metadata:
  version: "0.15.0"
  upstream: "lance-format/lance@v11.0.0-beta.6"
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

This skill tracks **`v11.0.0-beta.6`** (the `lance-format/lance` git tag), the current
development frontier; **`v10.0.0`** is the stable pin. Pin against tags, not `main` - Lance ships
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
Generated per-language SDK docs live at `lance-format.github.io/lance-{python,java}-doc`.

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
`v9.1.0` nor `v10.1.0` was ever released** - the 10.1 line exists only as
`v10.1.0-beta.{1,2}`, after which the train re-rooted to 11 off the same base.

The v10 line **did** ship a final: `v10.0.0` was tagged 2026-08-08 (annotated, "Release version
10.0.0") on the `release/v10.0` stabilization branch, which is **not an ancestor of `main`**.
Finals are cut on those branches, so "not on `main`" is normal, not a sign the release is
unofficial.

| Major | Its breaking theme |
|-------|--------------------|
| **v11** (current, `v11.0.0-beta.6`) | Fragment ids became a dataset-lifetime high-water mark; large internal reorganization of `lance-file` / `lance-encoding`; the first new manifest feature flag since v7. Delta below |
| **v10** | Blob APIs preserve null selections; cache keys became opaque BLAKE3 digests (every warm or persisted cache cold-misses, no legacy fallback); async `create_remapper`; MemWAL renamed generation -> SSTable, merge -> compaction (wire-compatible, symbol-breaking) |
| **v9.1** (never released; renamed into v10) | FTS/inverted creation took a `block_size` param. Net-new: Data Overlay Files (cell-level updates without base-file rewrite, unstable + env-gated), sparse structural pages, `lance-index-core` |
| **v9** | Python 3.9 dropped; `alter_columns` fails fast when casting an indexed column; FM-Index proto rename made existing FM indexes unreadable; FTS/inverted defaults to on-disk format v2 |
| **v8** | All index builds unified onto one segment-based lifecycle. Net-new: `lance-derive`, FM-Index, multi-bit IVF_RQ, public `approx_mode`, TOS + GooseFS object stores |
| **v7** | MemWAL, branches, the geo/RTree index, the `lance-select` crate, ICU FTS |

**`v10.0.0` is the stable pin** (2026-08-08, superseding `v9.0.1`), and it is what GitHub
Releases marks `Latest`. crates.io carries **finals only** (newest is `lance 10.0.0`; no 11.x,
and the only pre-release in ~186 versions is the ancient `0.0.1-alpha0`); PyPI `pylance` is
likewise at `10.0.0`. So a beta pin means a git dependency - beta wheels publish to fury.io
instead, under the renamed org (`https://pypi.fury.io/lance-format`).

Full per-tag deltas, with every PR citation: `references/changelog-v7-v11.md`.

## The v11 delta

222 commits from `v10.0.0-beta.7`, with **13 `breaking-change`-labeled PRs**. Most structural
invariants held: **26 crates**, **16 transaction ops**, `CommitConfig.num_retries` **20**,
file-format enum still `next => 2.3` / default 2.1 (no 2.4), arrow 58 / datafusion 54, MSRV
1.91.0, Edition 2024, Python 3.10+, and **no new `LANCE_*` env vars**.

**The manifest feature flags did change** - the first new bit since v7.
`FLAG_MEM_WAL_INDEX_CATCHUP = 128` was added and `FLAG_UNKNOWN` moved 128 -> 256. Both reader
and writer must hold the bit or refuse the table, and **setting it is one-way** (never cleared
as a rollback). Without it, a missing `index_catchup` entry reads as "fully caught up", so an
index-only query could answer without the SSTables holding the newest rows. Section 7.

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
- **`LanceFileVersion` lost its ordering** (#8027, #8028) - `PartialOrd`/`Ord` are gone, so
  `v >= LanceFileVersion::Next` no longer compiles; `resolve()` is now
  `const fn resolve(self) -> ConcreteFileVersion`; `iter_non_legacy()`,
  `support_add_sub_column()` and `support_remove_sub_column()` were deleted, as were both
  `From` conversions between selector and concrete version. New: `stable_file_version()`
  (V2_1) and `next_file_version()` (V2_3). Version decisions are now exhaustive matches at
  declared boundaries, not `>=`/`max` comparisons. Section 3.6.
- **`Operation::Project` / `Merge` gained `preserves_nullability: bool`** (#8347). Default
  `false` means "no assertion". A nullability *tightening* must not set it - its producer
  proved the claim by scanning at its read version, so a concurrent write can falsify it, and
  such a projection now **conflicts with any value-write in either commit order**. This closed
  a real hole: `alter_columns` proved NOT NULL by scanning, then committed a `Project` that
  conflicted with nothing, so a racing write could land nulls unreadable under the tightened
  schema. Section 9.2.
- **MemWAL index validation replaced** (#8360) - public `is_maintainable_index_type(&str)` is
  gone; use `validate_maintained_indexes(dataset, index_names)`. Type-URL filtering was
  unsound (an IVF-PQ over `FixedSizeList<Float64>` passed, then made the table unwritable).
  The new validator is all-or-nothing: it errors on the first unmaintainable index rather than
  returning a usable subset. Section 10.

**Net-new:**

- **FTS gained a document-boundary axis** (#7788) - `DocumentGranularity` (`ROW` /
  `LIST_ELEMENT`), a `posting_format_version` distinct from `index_version`, a `_doc_index`
  column. `document_granularity="list_element"` is a **third** trigger requiring FTS on-disk
  format v3, independent of `block_size=256` and the code-analyzer tokenizer. Section 11.3.
- **Large transactions spill out of the manifest** (#7881) - above `MAX_INLINE_TRANSACTION_BYTES`
  (**20 MiB**; the 64 KiB figure in the PR text is the `#[cfg(test)]` value, so every non-test
  build gets 20 MiB) the transaction lives solely in its external file. Measured: a full-commit
  manifest shrank 1576 MiB -> ~790 MiB. No new configuration. Note this cuts *read* round trips,
  not write ones - the separate `.txn` file is still written either way.
- A posting-backed compound FTS scoring core (#8092-#8094, #8131, #8299) - every clause combined
  with `AND` is a scoring `MUST` clause, so all must match **and every matching clause
  contributes to `_score`**; exact-null zone maps over every type (#8088, #8017); pluggable cache
  backends (#7683); the `aws_provider_scheme` storage option (#8103); `goosefs://` on
  `ConditionalPutCommitHandler` (#8134 - if-not-exists only holds once *every* writer is
  upgraded); multipart uploads keeping part identity across retries (#8174). **No new `LANCE_*`
  env vars landed in v11.**
- **MemWAL catch-up is now derived, not declared** (#8481, superseding #8263) - a commit no
  longer carries a claim about index coverage; coverage is derived from the version the
  transaction read. #8263's `IndexCatchupAdvance` proto message was added and then removed
  within the same beta window, so it **never shipped in a final**. Also new: memtable
  backpressure stats (#8241), `ShardWriter::delete` against non-nullable base columns (#8352),
  and `MemWalIndexDetails.index_catchup` (table.proto field 10). Section 10.
- **Transaction proto field 9 is deprecated** - `updated_fragment_offsets` gives way to field 10
  `updated_fragment_offset_bitmaps` (portable RoaringBitmap bytes, #7432). Writers emit field 10
  only; readers prefer 10 and fall back to 9 for older manifests. Section 9.
- Smaller API additions: `LanceFragment.validate()` (#8428), `BlobFile.read_ranges()` (#8319),
  `lance.fragment.RowIdSequence` (#8356 - duplicate ids now rejected instead of silently
  mis-encoded), `write_fragments(session=...)` (#8034), `lance.tokenize` (#8415), and Java
  cache-backend selection (#8446) plus `Index.getSizeBytes()` (#8355).

**Eleven silent-corruption and wrong-results fixes landed in v11** - several invalidate advice
that was safe to give at v10, including cleanup irreversibly deleting live overlay data (#8267)
and `optimize_indices` leaving duplicate rows ranked by a stale vector (#8342). The full list,
with the conditions that trigger each, is in `references/changelog-v7-v11.md`.

Full delta including the Python/Java surface: `references/changelog-v7-v11.md`.

## Performance questions

For anything performance-shaped - slow scans or searches, remote/object-storage cost, index
maintenance cost, memory sizing, version bloat, benchmarking - load
`references/performance.md` first. Part A routes to every official performance recommendation
plus the undocumented source-derived changes; Part B is field-verified practice from running
Lance against S3-compatible storage. The governing rule stays **minimize remote calls** - fewer
commits, fewer scans, fewer round trips - because that is where the order-of-magnitude wins are.
v11 added an official **"Tuning remote scans"** section giving a concrete starting point
(`LANCE_IO_THREADS=8`, `fragment_readahead=1`, `batch_readahead=2`, `io_buffer_size=64MB`) for
cross-region or public-internet access, where the cloud default of 64 concurrent requests is too
aggressive; treat it as a legitimate second move once call volume is already minimized.

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
| `format/index/scalar/` | 9 | fts, fmindex, ngram, btree, bitmap, bloom_filter, label_list (`array_has_any/all`), zonemap, rtree |
| `format/index/vector/` | 1 | IVF / PQ / SQ / RQ / HNSW concepts and storage layout |
| `format/index/system/` | 2 | Fragment reuse index, MemWAL system index |
| `integrations/` | 1 | DataFusion SQL over Lance, incl. JSON functions |

**Not mirrored:** `docs/src/images/` (the PNG/GIF diagram assets). Image links inside the
mirrored pages therefore do not resolve - the surrounding prose is self-contained, and the four
index-lifecycle `.drawio.svg` diagrams under `format/index/` *are* mirrored. Also outside the
mirror by design: the `community/`, `examples/`, and `integrations/{pytorch,tensorflow}` pages;
the landing/index stubs (`index.md`, `sdk_docs.md`, `integrations/index.md`) and the
contributor files (`format/AGENTS.md`, `format/CLAUDE.md`); and `format/catalog` +
`format/namespace`, which are assembled at build time from sibling repos with their own
version lines. The Spark / Ray / Trino integrations are no longer in the checked-in nav at all -
#8419 deleted them so the committed file matches what `make-full-website.sh` produces when the
external docs are absent.
