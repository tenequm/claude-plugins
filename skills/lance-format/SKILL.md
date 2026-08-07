---
name: lance-format
description: Deep reference for Lance v11 - the open columnar lakehouse format for multimodal AI - and its Rust crate workspace plus pylance. Covers the 2.x file format and structural encodings, the table format (manifests, fragments, transactions, OCC), vector / scalar / full-text indexes, MemWAL, schema evolution, time travel, namespaces, and object-store config. Use when building directly on the Lance crates or reading `.lance` datasets; this is the Lance format and engine (`lance-format/lance`), not the LanceDB product built on top of it.
metadata:
  version: "0.13.0"
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
development frontier. Pin against tags, not `main` - Lance ships beta tags every few days and
`next`-format encodings can change.

**Which tag to pin.** Lance's release train bumps the major automatically: `ci/publish_beta.sh`
compares the release root to HEAD and, if any PR in the range carries the GitHub
`breaking-change` label, re-roots at `MAJOR+1`. The marker is the **label**, not a
conventional-commit `!` - of the nine labeled PRs behind this bump, only two carry `!` in the
subject. It has now fired twice in a row: the `9.1.0-beta.*` line became `10.0.0-beta.*` on
2026-07-23, and the `10.1.0-beta.*` line became `11.0.0-beta.*` on 2026-08-05 (`chore: bump to
11.0.0-beta.1 based on breaking change detection`). So **neither `v9.1.0` nor `v10.1.0` was ever
released**, and `v10.1.0-beta.2` is the direct ancestor of `v11.0.0-beta.1` - a single bump
commit apart. The re-root renumbers in place: `release-root/10.1.0-beta.N` and
`release-root/11.0.0-beta.N` point at the **same commit**, both recording `Base: 10.0.0-rc.1`.
A major bump therefore signals "some labeled breaking change landed", not a redesign.

**`v10.0.0` final was never tagged either.** That line stopped at `v10.0.0-rc.3` (2026-08-02) on
the `release/v10.0` stabilization branch, which forked at `v10.0.0-beta.7` and has taken only one
substantive backport since. It is *not* an ancestor of `main`.

**`v9.0.1` is the stable pin** (2026-08-06; supersedes `v9.0.0`, 2026-07-24). It shipped
alongside five other patch finals that day - `v8.0.1`, `v7.1.0`, `v6.1.0`, `v4.0.2`, `v3.0.2` -
each on its own `release/vX.Y` branch; note `v5.0.0` still has no final. crates.io carries
**finals only** (newest is `lance 9.0.1`; no 10.x or 11.x, and no pre-release of any kind), so a
beta pin means a git dependency. Beta artifacts publish to fury.io instead.

Three layers of reference, load what the task needs:

- `references/lance-reference.md` - the distilled deep reference. Any concrete schema,
  parameter, proto, or constraint.
- `references/performance.md` - ALL official performance guidance combined, plus
  field-verified remote-storage practices. Load for any performance, tuning, maintenance-cost,
  or "why is this slow" question.
- `references/docs/` - a **verbatim mirror of the official docs** (`docs/src` at the tracked
  tag): every guide, quickstart, and format spec, unedited. Load when you need the full
  official text. Complete file map below.

This file is the orientation: read it first, then jump into what you need.

## Lance vs LanceDB

These are two different things and conflating them produces wrong answers.

- **Lance** - the format and engine. The `lance-format/lance` repo; the `lance` /`lance-*`
  Rust crates; `pylance`. It gives you datasets, the file/table format, indexes, commits,
  scans. Consumed directly by DuckDB, Polars, Ray, Spark, PyTorch, DataFusion, or your own
  Rust/Python code. **This skill is about Lance.**
- **LanceDB** - a separate database *product* (`lancedb/lancedb`) built on top of Lance. It
  adds a query-builder API, an embedding registry, rerankers-as-API, multi-language SDK
  parity, and managed Cloud / Enterprise tiers. Not covered here.

**The wider ecosystem** (separate repos, own version lines, none covered here): Apache Flink
streaming writes (`lance-flink`), PostgreSQL reads via the `pglance` extension, a Cypher graph
engine (`lance-graph`), a read-only dataset browser (`lance-data-viewer`), and multimodal
agentic context management (`lance-context`). The namespace spec has reference catalog
implementations for Apache Hive, Apache Polaris, Apache Gravitino, Unity Catalog, and AWS Glue.
Generated per-language SDK docs live at `lance-format.github.io/lance-{python,java}-doc`.

If you are linking the `lance` crate in `Cargo.toml`, you are using Lance directly - use this
skill. If a question is about LanceDB internals, the storage layer underneath it is still
Lance, so this skill remains the authority for the format itself.

## The crate workspace

26 crate directories under `rust/`. `lance` is the public entry point; the rest are layers
beneath it. Full table with descriptions and citations in `references/lance-reference.md` section 2.

| Crate | Role |
|-------|------|
| `lance` | Public entry point - `Dataset`, scanner, indexes, commits |
| `lance-table` | Table format - manifest, feature flags, commit handlers, row IDs |
| `lance-file` | File format - file reader/writer |
| `lance-encoding` | Structural encodings, compression (internal, not for external use) |
| `lance-index` | Scalar / vector / FTS / system indexes |
| `lance-index-core` | Shared index primitives extracted from `lance-index` (new in the 9.1/10.0 dev line, PR #7713) |
| `lance-io` | Object store, I/O schedulers |
| `lance-core` | Shared `Error`/`Result`, cache, datatypes |
| `lance-datafusion` | DataFusion glue (exec, expr, planner, UDFs) |
| `lance-linalg` | SIMD L2 / dot / cosine / hamming kernels |
| `lance-select` | Row-selection primitives - `RowAddrMask`, `RowIdMask`, `IndexExprResult` (extracted from `lance-core`/`lance-index` in v7.1.0-beta.2) |
| `lance-tokenizer` | FTS tokenizer stack (simple, ngram, jieba, lindera, stemmers) |
| `lance-derive` | `#[derive(DeepSizeOf)]` proc-macro for Arrow-aware memory accounting (new in v8, PR #6229; replaced the external `deepsize` crate) |
| `lance-geo` | Geospatial UDFs (feature-gated `geo`) |
| `lance-namespace` / `-impls` / `-datafusion` | Namespace trait, Directory/REST impls, DataFusion catalog bridge |
| `lance-arrow`, `lance-tools`, `fsst`, `lance-bitpacking`, ... | Arrow extensions, CLI, compression sub-crates |

All share `version = "11.0.0-beta.2"` except the two Arrow-tracking crates,
`lance-arrow-scalar` and `lance-arrow-stats`, both pinned at `=58.0.0`. Workspace: edition
2024, `rust-version = 1.91.0` (MSRV; the pinned build toolchain in `rust-toolchain.toml` is
1.97.0, PR #7712), `resolver = "3"`; notable deps arrow 58, datafusion 54, **opendal 0.58.1**
(0.57 in v10, PR #7823), `object_store` 0.13.2, `object_store_opendal` 0.58, jieba-rs 0.10,
`lance-namespace-reqwest-client` 0.8.6, itertools 0.14, and blake3 1.8.5 (the cache-key digest).
Dropped from workspace deps in v11: `strum` and `goosefs-sdk` (GooseFS now runs purely through
opendal). The FTS stemmer swapped `rust-stemmers` -> **`frostem`** (PR #8183): the unmaintained
crate could panic slicing shortened Greek words; the 18-language API is unchanged. Python
bindings require **Python 3.10+** (3.9 dropped in v9, PR #7345; 3.14 supported, PR #7728).

**Crate internals moved substantially in v11** (PRs #8020-#8026). If you depend on anything
below `lance`, expect breakage: `lance-encoding::version` is **deleted** with no re-export -
`LanceFileVersion` and `ConcreteFileVersion` now both live in `lance-file::version`;
`lance_io::encodings` and `lance-encoding::previous` are gone; `lance-file::previous` became
`lance-file::versions::v1`; and each current format got its own `versions/v2_{0,1,2,3}` module
owning construction, decoder selection, and compression. `lance-encoding` grew an
`array_encoding/` tree in place of its removed public encoder surface.

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
| `2.3` | unstable (`next`) | The current `next` alias target (`V2_3` in the enum). **No longer scaffolding** - ships **sparse structural pages** (PR #7889), which the 2.3 writer now **auto-selects** under a rep/def budget heuristic (PR #7756). The docs version table names it "sparse structural pages and other experimental encodings" |

`stable` resolves to the default (2.1); `next` now resolves to **2.3** (not 2.2) in the
running Lance release - pin an explicit number for deterministic behavior. In the version
ladder 2.2 sits *below* `next`, so the code does not flag 2.2 as unstable. The docs version
table (`docs/src/format/file/versioning.md`) lists **2.3** as the unstable row and no longer
labels 2.2 unstable - and 2.3 now carries its own concrete experimental encoding (sparse
pages), on top of the 2.2-era features (Map, Blob v2, `VariablePackedStruct`).

**Sparse is no longer opt-in only.** As of v10 the 2.3 writer selects sparse on its own
"when the dense mini-block repetition/definition budget would split the page or one top-level
row exceeds that budget, and only when the value path is supported by the sparse writer"
(`docs/src/format/file/encoding.md:373-375`). Unsupported paths - dictionary values,
variable-width packed structs - stay dense, and 2.2-and-earlier writers never auto-select.
The `lance-encoding:structural-encoding` field-metadata key (`miniblock`/`fullzip`/`sparse`)
is now documented as **Force** a structural encoding rather than *select* one; auto-selection
adds no wire-format field.

Alongside this, v10 split the version type in two: `LanceFileVersion` keeps the release
*selectors* `stable`/`next`, while `ConcreteFileVersion` is the exact persisted identity. In
v11 **both moved into `lance-file::version`** (PR #8026) - `lance-encoding::version` no longer
exists. See `references/lance-reference.md` section 3.6.

## What's new in v11

128 commits from `v10.0.0-beta.7`, with **nine `breaking-change`-labeled PRs**. The structural
invariants all held: **26 crates**, **16 transaction ops**, `CommitConfig.num_retries` **20**,
file-format enum still `next => 2.3` / default 2.1 (no 2.4), arrow 58 / datafusion 54, MSRV
1.91.0, manifest feature flags unchanged. The weight is in a **large internal reorganization of
`lance-file` / `lance-encoding`** and one format-level invariant change.

**Breaking:**

- **Fragment ids are now a dataset-lifetime high-water mark** (#8206) - the sharpest change
  here, because it is a *format* invariant, not just an API. Overwrite no longer restarts ids
  at 0; the first fragment an overwrite writes takes the next id after the dataset's highest
  ever used, so "an id must never name two different sets of rows". Two commits that used to
  succeed now error: an overwrite fragment carrying a deletion file is rejected (a deletion
  file cannot follow its fragment to a new id - its path embeds the old one), and **any**
  commit producing duplicate fragment ids is rejected. Datasets written by Lance 0.16 and
  earlier may already contain duplicates: still readable, no longer committable. Code doing
  `dataset.get_fragment(0)` after an overwrite must read ids from the manifest instead.
- **The file-version types and the whole reader/writer composition moved** (#8024, #8025,
  #8026, #8020, #8021, #8023). `lance-encoding::version` is deleted with no re-export -
  depend on `lance-file` for `LanceFileVersion`. `FileWriter` changed from a struct to an
  **enum** with all constructors removed (use the `versions::create_writer` family);
  `FileWriterOptions` lost `encoding_strategy` and `format_version`; `FileReader::version()`
  now returns `ConcreteFileVersion`; `ReaderProjection`'s constructors became free functions;
  `lance_io::encodings` and the `previous` namespaces are gone. Only two of these carry a `!`
  in the commit subject - the rest break silently at compile time. Section 3.6.
- **`DataBlockBuilder::append` is now fallible** (#8172) and `DataBlockBuilderImpl` is private.
  Malformed variable-width offsets now yield `Error::CorruptFile` instead of panicking or
  producing garbage, so some files that previously "read" now error.
- **HNSW construction changed** (#8188): `OnlineHnswBuilder::with_capacity` is deprecated in
  favour of `try_with_capacity`, `m < 4` is now rejected outright, and the persisted level
  layout was corrected (`max_level + 1` offsets) - truncating to the sampled height had broken
  version-1 readers. Expect different graphs and different recall.
- **`MemWalIndex::force_seal_active` returns `SealFence`** instead of `()` (#8051) - existing
  `.await?;` call sites still compile. `MemIndexConfig::detect_index_type` was replaced by a
  free `is_maintainable_index_type` plus a typed `MemIndexKind` enum (#8095).
- **`CacheBackend` gained `deep_size_of_entries`** (#8159, defaulted so source-compatible), but
  reported cache sizes shrink: shared `Arc`/Arrow allocations are no longer charged once per
  entry. Anything budgeting against `LanceCache::deep_size_of()` sees different numbers.
- **`MiniBlockCompressor::compress` takes a context parameter** (#8038). Out-of-tree codecs
  break; persisted bytes and codec selection are unchanged.

**Net-new:**

- **FTS gained a document-boundary axis** (#7788) - `DocumentGranularity` (`ROW` /
  `LIST_ELEMENT`) and a `posting_format_version` field distinct from `index_version`, both
  persisted, plus a `_doc_index` column. `document_granularity="list_element"` is a **third**
  trigger requiring FTS on-disk format v3, independent of `block_size=256` and the
  code-analyzer tokenizer. Section 11.3.
- **A posting-backed compound FTS scoring core** (#8092-#8094, #8131, #8299) - Boolean, Phrase,
  and Boost composition over a shared `ComposableScorer`, a public `CompoundQueryExec` for
  distributed engines, and conjunctions ordered by iterator cost. Semantics worth knowing:
  every clause combined with `AND` is a scoring `MUST` clause, so all clauses must match **and
  every matching clause contributes to `_score`**; phrase-containing compound queries require
  an index with positions.
- **Zone maps track exact nulls and cover every type** (#8088, #8017) - a `has_null_bitmap`
  flag makes `IS NULL` exact and lets `IS NOT NULL` skip the scan; nested types (List, FSL,
  Struct, Map) get null counts but no min/max.
- **Large transactions spill out of the manifest** (#7881) - above `MAX_INLINE_TRANSACTION_BYTES`
  (**20 MiB** in release builds; the 64 KiB figure in the PR text is test-only) the transaction
  lives solely in its external file. Measured: a full-commit manifest shrank 1576 MiB -> ~790 MiB.
  No new configuration.
- **Pluggable cache backends** (#7683) - a process-wide registry with `register_backend` /
  `build_from_config` and a compact URI form (`moka://?capacity=1073741824`). Duplicate `kind`
  registration errors rather than silently overriding.
- **`aws_provider_scheme` storage option** (#8103) - pin a dataset to `token`, `ecs`, or `irsa`
  credentials, for processes where two buckets need different AWS auth. And **`goosefs://` now
  commits through `ConditionalPutCommitHandler`** (#8134) - but the if-not-exists guarantee
  only holds if *every* writer is upgraded; an older writer still selects `UnsafeCommitHandler`
  and can clobber a manifest the new one already won.
- Multipart uploads keep part identity across retries (#8174, native S3/Azure/GCS only - the
  old path silently skipped the failed part and completed with `Missing part`);
  `LANCE_CONN_RESET_RETRIES` was removed with it. **No new `LANCE_*` env vars landed in v11.**
- Python/Java surface: pydantic auto-conversion and `from_pydantic_model`; `size_bytes` on file
  writes; `max_source_fragments` for incremental `compact_files`; `blob_handling` on the SQL
  builder; and a substantial Java build-out (OpenTelemetry bridge, `ScanOptions` +
  `MaterializationStyle`, `FragmentStatistics`, typed `LanceException`, index build progress).
  Full delta in `references/lance-reference.md` section 14.

## What's new in v10

The renamed continuation of the 9.1 dev train, 78 commits from `v9.1.0-beta.8`, with **four
labeled breaking changes**:

- **Blob APIs preserve null selections** (#7903) - every request yields exactly one result, a
  null blob returning `None` instead of being omitted. Rust `take_blobs*` ->
  `Vec<Option<BlobFile>>`, `ReadBlob::data` -> `Option<Bytes>`; Python `read_blobs ->
  List[Tuple[int, Optional[bytes]]]`. Call sites that indexed results positionally against
  inputs were silently wrong before.
- **Cache keys became an opaque 16-byte BLAKE3 digest** (#7878, `CACHE_KEY_FORMAT =
  "blake3-128-v1"`) - every warm or persisted cache cold-misses after upgrade, with no
  legacy-key fallback. `CacheBackend::invalidate_prefix`, `LanceCache::keys`, and
  `Session::{index,metadata}_cache_keys` are gone.
- **`IndexRemapperOptions::create_remapper` became async**, returning
  `Result<Option<Box<dyn IndexRemapper>>>` (#7778) - `None` lets compaction skip the `_rowid`
  scan entirely.
- **MemWAL renamed its central primitive**: flushed generation -> **SSTable**, merge ->
  **compaction**, across spec, Rust, Python, Java, and `protos/`. Proto field numbers are
  unchanged, **so the wire format and on-disk layout stayed compatible** - but every generated
  symbol changed, with no deprecation shims. Section 10.

Net-new in v10: `ConcreteFileVersion` (#7879, deliberately *unordered* because "format
capabilities are not implied by release order"; manifests reject selector aliases); sparse
structural pages **auto-selecting** in the 2.3 writer (#7756, see above); segmented index builds
extended to BLOOMFILTER, RTREE, NGRAM, and LABEL_LIST (`IndexSegment::new` 4 -> 6 params; NGRAM
segments built before a deferred compaction **must** be merged before commit); ACORN-1
prefiltered HNSW traversal (#7927, `approx_mode="fast"` only); FTS throughput work including
`LANCE_FTS_SEARCH_CHUNK` (default 16) and deterministic `_score DESC, _rowid ASC` ties; and data
overlay correctness fixes. Full delta in `references/lance-reference.md` section 14.

## What's new in v9

### v9.0 -> v9.1 (the predecessor dev line)

The 9.1 dev line branched off `main` when `v9.0.0-rc.1` was cut for stabilization - an
automatic release-train bump, not a breaking change. Structural deltas from beta.18:
**26 crates** (new `lance-index-core`, #7713), **16 transaction ops** (new `DataOverlay`,
below), **datafusion 53 -> 54** (#7793), and the build toolchain moved to Rust 1.97.0 (#7712;
MSRV `rust-version` unchanged at 1.91.0). `CommitConfig.num_retries` still **20**, file-format
enum still `next => 2.3` / default 2.1.

One breaking-labeled PR in the window: **FTS/inverted-index creation takes a `block_size`
param** (compressed posting blocks; 128 or 256, default 128, 512 rejected, #7466). `block_size=256`
and the new **code-analyzer tokenizer** (#7681) require FTS on-disk **format v3** (#7866) -
readers must support v3 before such an index exists.

Net-new in 9.1:
- **Data Overlay Files** - attach new values for a subset of `(row offset, field)` cells to a
  fragment **without rewriting its base data files** (the upstream answer to cheap cell-level
  updates). New `DataOverlay` transaction op, feature flag 64, spec
  `references/docs/format/table/data_overlay_file.md`. Still **unstable**: env-gated by
  `LANCE_ENABLE_UNSTABLE_DATA_OVERLAY_FILES`, and release builds refuse overlay datasets
  (#7535, #7536).
- **Sparse structural pages** - the first real 2.3 encoding; represent flat/nested Arrow
  structure as slot-domain mappings instead of dense rep/def events (#7889).
- **Exact `IS NULL`** from zonemap and bloom-filter indexes via a new `null_bitmap` (was
  inexact / `AtMost`); **nested-field FTS** (index leaf fields like `data.text`, #7686);
  FTS impact-skip / MAXSCORE top-k / bulk-conjunction paths (#7602, #7603, #7624).
- **OpenTelemetry metrics** for Python (`instrument_lance_metrics`, `pylance[otel]`, #7537);
  AWS creds via `AssumeRoleWithWebIdentity` to avoid role chaining (#7757); Python 3.14
  support (#7728). Full delta in `references/lance-reference.md` section 14.

### v8 -> v9

A **light major bump** - v9.0 was structurally near-identical to v8 - auto-triggered by the
`breaking-change`-label detector on four PRs: **Python 3.9 dropped** (minimum 3.10, #7345);
**`alter_columns` fails fast** when casting an indexed column, so `drop_index()` first instead
of relying on the old silent drop/invalidate (#7158); the FM-Index proto renamed
`FMIndexIndexDetails` -> `FMIndexDetails` (#7397), which makes existing FM indexes unreadable;
and **FTS/inverted indexes defaulting to on-disk format v2** (#7512) - `LANCE_FTS_FORMAT_VERSION`
no longer controls new indexes, pass `format_version=1` if older readers must read them
(existing v1 indexes stay queryable, section 11.3). One API removal: `as_vector_index` left the
`Index` trait (#7392) - downcast via `as_any()`.

Net-new in v9: hamming clustering for near-duplicate detection (#7379); COUNT(*) pushdown on
stable-row-id datasets (#7360); per-column blob size thresholds (#7269); tunable miniblock
chunks via `LANCE_MINIBLOCK_MAX_VALUES` (#7356, default still 4096); an `icu/split` FTS
tokenizer (#7474); distributed LabelList index builds (#7223); ngram acceleration for regex and
infix LIKE (#7139).

The **v7 -> v8** boundary unified all index builds onto one segment-based lifecycle (#6869,
#6997, #7013), had `finish()` start returning `FileWriteSummary` (#7096), and added the
`lance-derive` crate (#6229), the **FM-Index** scalar index, **multi-bit IVF_RQ** (`num_bits`
1..=9), the public vector-search **`approx_mode`** (`fast`/`normal`/`accurate`), and the
**Volcengine TOS** (`tos://`) and feature-gated **GooseFS** (`goosefs://`) object stores. The v7
era - MemWAL, branches, the geo/RTree index, the `lance-select` crate, ICU FTS - carries
forward. Full deltas in `references/lance-reference.md` section 14.

## Navigating the reference

`references/lance-reference.md` is the full v11 reference, regrounded against the
`v11.0.0-beta.2` source (128 commits from `v10.0.0-beta.7`, 9 breaking-labeled PRs - delta in
its section 14). Load the section for your task:

1. **What Lance is** - the lakehouse spec stack
2. **Crate workspace** - all 26 crates, what each does, the public entry point
3. **File format** - versions, container layout, structural encoding (mini-block / full-zip /
   constant / blob page types), compression schemes, blob encoding, `ConcreteFileVersion`
4. **Data types** - Arrow type coverage, FixedSizeList for vectors, JSON (JSONB), blob, ML
   extension arrays (bfloat16, image types)
5. **Table format** - dataset directory layout, manifest contents, fragments, deletion
   files, base paths
6. **Schema evolution** - field IDs, zero-copy column add/drop/alter, why old rows read NULL
7. **Versioning, tags, branches** - manifest versions, time travel, tag pinning, branches
8. **Row IDs** - row address vs stable row ID, lineage, change-data-feed columns
9. **Transactions and concurrency** - the 16 transaction ops, OCC retry/rebase, commit
   handlers (conditional-put, DynamoDB), conflict resolution matrix
10. **MemWAL** - shards, MemTable/WAL/SSTable, compaction, the appender/tailer/flusher model,
    fencing
11. **Indexes** - vector (IVF/HNSW/PQ/SQ/RQ, multi-bit RQ), scalar (btree/bitmap/bloom/
    labellist/ngram/zonemap/FM-Index), full-text (BM25, tokenizers), geo/RTree
12. **Distributed write and indexing** - two-phase commits, segment-based index builds
13. **Object store** - URI schemes, storage options, per-backend config
14. **What changed** - the full v7 -> v8 -> v9 -> v10 -> v11 delta
15. **Capability matrix** - what Lance can and cannot do
16. **Source map** - where each spec and proto lives in the repo

## Performance questions

For anything performance-shaped - slow scans or searches, remote/object-storage cost,
index maintenance cost, memory sizing, version bloat, benchmarking - load
`references/performance.md` first. Part A collects every official performance
recommendation in one place; Part B is field-verified practice from running Lance against
S3-compatible storage, whose governing rule is: **leave the store knobs
(`LANCE_IO_THREADS`, `LANCE_AIMD_*`, timeouts, compression metadata) at their defaults and
optimize by minimizing remote calls** - fewer commits, fewer scans, fewer round trips.

## Official docs mirror - file map

`references/docs/` mirrors `docs/src` of `lance-format/lance` at the tracked tag, verbatim.
Every file below is directly readable; pick by topic.

**Not mirrored:** `docs/src/images/` (the PNG/GIF diagram assets). Image links inside the
mirrored pages therefore do not resolve - the surrounding prose is self-contained, and the four
index-lifecycle `.drawio.svg` diagrams under `format/index/` *are* mirrored. Also outside the
mirror by design: the `community/`, `examples/`, and `integrations/{pytorch,tensorflow}` pages;
the landing/index stubs (`index.md`, `sdk_docs.md`, `integrations/index.md`) and the
contributor files (`format/AGENTS.md`, `format/CLAUDE.md`); and the published-site sections
(`format/catalog`, `format/namespace`, and the Spark / Ray / Trino / DuckDB / HuggingFace
integrations) that are assembled at build time from sibling repos with their own version lines.

### Guides (`references/docs/guide/`)

| File | Covers |
|------|--------|
| `read_and_write.md` | CRUD, `merge_insert` semantics, `cleanup_old_versions` + automatic cleanup |
| `performance.md` | The official performance guide (also embedded in `references/performance.md`) |
| `object_store.md` | URI schemes, credentials, `storage_options` per backend (S3/GCS/Azure/...) |
| `distributed_write.md` | Two-phase distributed writes - fragments on workers, single commit |
| `distributed_indexing.md` | Segment-based distributed index builds, merge, finalize |
| `json.md` | JSON columns, `json_get_*` / `json_extract`, JSON scalar index |
| `tokenizer.md` | FTS tokenizer configuration - language, stemming, jieba/lindera/icu |
| `data_types.md` | Arrow type coverage, FixedSizeList vectors, JSON, blob |
| `data_evolution.md` | Zero-copy add/drop/alter columns, backfills |
| `blob.md` | Blob columns - storing and reading large binary |
| `arrays.md` | ML extension arrays (bfloat16, image types) |
| `tags_and_branches.md` | Managing tags and branches |
| `migration.md` | Migration guides across Lance versions |
| `observability.md` | Logging, trace events, object-store metrics |

### Quickstarts (`references/docs/quickstart/`)

| File | Covers |
|------|--------|
| `index.md` | First dataset - core table operations end to end |
| `vector-search.md` | ANN index tutorial - build, tune, filtered search |
| `full-text-search.md` | FTS tutorial incl. index maintenance + performance tips |
| `versioning.md` | Time travel, restore, cleanup basics |

### Format specs (`references/docs/format/`)

| File | Covers |
|------|--------|
| `index.md` | The spec-stack overview |
| `file/index.md` | File-format container spec |
| `file/encoding.md` | Structural encodings and compression strategy |
| `file/versioning.md` | File-format versions (2.0 / 2.1 / 2.2 / 2.3) |
| `table/index.md` | Table-format overview |
| `table/data_overlay_file.md` | Data Overlay Files - cell-level `(offset, field)` updates without base-file rewrite (feature flag 64, unstable) |
| `table/layout.md` | Dataset directory layout |
| `table/schema.md` | Schema and field-metadata spec |
| `table/transaction.md` | Commit protocol, transaction ops, **conflict-resolution matrix** |
| `table/versioning.md` | Manifest versioning and feature flags |
| `table/row_id_lineage.md` | Stable row IDs, lineage, change-data-feed columns |
| `table/branch_tag.md` | Branch and tag spec |
| `table/mem_wal.md` | MemWAL / streaming-write spec (experimental) - SSTables, compaction, shard manifests |

### Index specs (`references/docs/format/index/`)

| File | Covers |
|------|--------|
| `index.md` | Index lifecycle - creation, fragment coverage, compaction interplay (with diagrams) |
| `vector/index.md` | Vector indices - IVF / PQ / SQ / RQ / HNSW concepts and storage layout |
| `scalar/fts.md` | Inverted (FTS) index - tokenizers, posting lists, memory/disk costs |
| `scalar/fmindex.md` | FM-Index - substring / regex search over raw bytes |
| `scalar/ngram.md` | N-gram index - `contains()` and LIKE acceleration |
| `scalar/btree.md` | BTree - range queries, sorted access |
| `scalar/bitmap.md` | Bitmap - low-cardinality equality |
| `scalar/bloom_filter.md` | Bloom filter index |
| `scalar/label_list.md` | Label-list index for `array_has_any/all` |
| `scalar/zonemap.md` | Zone maps - per-zone min/max/null-count stats |
| `scalar/rtree.md` | R-Tree geospatial index |
| `system/frag_reuse.md` | Fragment Reuse Index - compaction without index remap |
| `system/mem_wal.md` | MemWAL system index entry |

### Integrations (`references/docs/integrations/`)

| File | Covers |
|------|--------|
| `datafusion.md` | SQL over Lance via DataFusion, incl. JSON functions |

## Maintenance

Citations in `references/lance-reference.md` are `path:line` relative to the `lance-format/lance` repo;
build a permalink as `https://github.com/lance-format/lance/blob/v11.0.0-beta.2/<path>`.

To refresh: `git -C <your lance-format/lance clone> fetch --tags`, check out the newest tag
(the major may have jumped again - the release train re-roots on any `breaking-change` label,
and it has now fired on two consecutive lines, so sort tags by date rather than assuming the
current major, and do not assume the previous major ever got a final), then:

1. Re-copy the docs mirror: the `.md` files of `docs/src/{guide,quickstart}`,
   `docs/src/format` (plus the `format/index/*.svg` diagrams), and
   `docs/src/integrations/datafusion.md` into `references/docs/`, preserving the tree.
   Update this file's file map if docs were added or removed. Two deviations from upstream
   bytes are expected and enforced by this repo's pre-commit hooks, not drift: trailing
   whitespace is stripped from every file, and `end-of-file-fixer` removes the trailing blank
   line that `format/table/layout.md` and `format/table/row_id_lineage.md` carry upstream.
   Normalize both before diffing the mirror against a new tag.
2. Rebuild Part A of `references/performance.md` from the new `guide/performance.md` and
   the other perf sections it cites. Part B (field-verified practices) is
   experience-derived - only edit it with new *measured* results, never speculation.
3. Re-verify the crate workspace and re-read the format spec for `references/lance-reference.md`,
   then bump `metadata.upstream` plus every current-tag version reference. Line numbers in
   citations drift between tags - treat them as approximate.
