# Lance changelog - v7 -> v11 (section 14)

Part of the Lance v11 reference (`lance-format/lance@v11.0.0-beta.2`). Citations are `path:line`
relative to the repo root; build a permalink as
`https://github.com/lance-format/lance/blob/v11.0.0-beta.2/<path>`. Line numbers drift between
tags - treat them as approximate. Cross-references written as "section N" use the original
16-section numbering; `lance-reference.md` maps every number to its file.

**Release-line shape.** The major is bumped by a bot, not a human: `ci/publish_beta.sh:65,87`
re-roots at `MAJOR+1` whenever any PR since the release root carries the GitHub
`breaking-change` label (`ci/check_breaking_changes.py:31`). The marker is the **label**, not a
conventional-commit `!` - of the nine labeled PRs in this window (#8024, #8025, #8026, #8051,
#8095, #8159, #8172, #8188, #8206) only two carry `!` in the subject. It has now fired on two
consecutive lines: `9.1.0-beta.*` -> `10.0.0-beta.*` (2026-07-23), then `10.1.0-beta.*` ->
`11.0.0-beta.*` (2026-08-05, `649076df1 chore: bump to 11.0.0-beta.1 based on breaking change
detection`). So **neither `v9.1.0` nor `v10.1.0` was ever released**, and `v10.1.0-beta.2` is
the direct ancestor of `v11.0.0-beta.1`, one bump commit apart. The re-root renumbers in place:
`release-root/10.1.0-beta.N` and `release-root/11.0.0-beta.N` point at the same commit
(`ee0a60d0c`), both recording `Base: 10.0.0-rc.1`.

**`v10.0.0` final was never tagged.** That line stopped at `v10.0.0-rc.3` (2026-08-02) on
`release/v10.0`, which forked at `v10.0.0-beta.7` and took one substantive backport
(`10d0c9f2e fix: backport encoding and FTS fixes to release/v10.0`, #8146). It is not an
ancestor of `main`; `v10.0.0-beta.7` **is** an ancestor of `v11.0.0-beta.2`, but `v10.0.0-rc.3`
is not.

**`v9.0.1` is the stable pin** (2026-08-06, superseding `v9.0.0`, 2026-07-24), shipped with five
sibling patch finals that day - `v8.0.1`, `v7.1.0`, `v6.1.0`, `v4.0.2`, `v3.0.2` - each on its
own `release/vX.Y` branch. `v5.0.0` still has no final despite `v5.0.0-rc.2`. crates.io
publishes **finals only** (`max_stable_version` = `9.0.1`; no 10.x, no 11.x, no pre-releases of
any kind), so any beta pin is a git dependency; beta artifacts publish to fury.io
(`.github/workflows/publish-beta.yml:114`).

## Contents

- [The v7.1.0-beta.1 delta](#the-v710-beta1-delta)
- [The v7.1.0-beta.2 delta](#the-v710-beta2-delta)
- [The v7.1.0-beta.2 -> v7.2.0-beta.5 delta](#the-v710-beta2---v720-beta5-delta)
- [The v7.2.0-beta.5 -> v8.0.0-beta.9 delta (major-version boundary)](#the-v720-beta5---v800-beta9-delta-major-version-boundary)
- [The v8.0.0-beta.9 -> v8.0.0-beta.14 delta](#the-v800-beta9---v800-beta14-delta)
- [The v8.0.0-beta.14 -> v9.0.0-beta.10 delta (v8 -> v9 major boundary)](#the-v800-beta14---v900-beta10-delta-v8---v9-major-boundary)
- [The v9.0.0-beta.10 -> v9.0.0-beta.16 delta](#the-v900-beta10---v900-beta16-delta)
- [The v9.0.0-beta.16 -> v9.0.0-beta.18 delta](#the-v900-beta16---v900-beta18-delta)
- [The v9.0.0-beta.18 -> v9.1.0-beta.8 delta](#the-v900-beta18---v910-beta8-delta)
- [The v9.1.0-beta.8 -> v10.0.0-beta.7 delta](#the-v910-beta8---v1000-beta7-delta)
- [The v10.0.0-beta.7 -> v11.0.0-beta.2 delta (current tag)](#the-v1000-beta7---v1100-beta2-delta-current-tag)

Other files: `format-file.md` (1-4), `format-table.md` (5-10), `indexes.md` (11-12),
`ops.md` (13, 15, 16).

---

## 14. What changed (v7 -> v11)

The v7 tag line ran `v7.0.0-beta.1` through `v7.0.0-beta.17`, then `v7.0.0-rc.1` and
`v7.0.0`. The v7.1 line opened at `v7.1.0-beta.1`, continued through `v7.1.0-beta.4` and
`v7.1.0-rc.1`; the v7.2 line ran through `v7.2.0-beta.5`; the **v8 line** ran through
`v8.0.0-beta.19` to `v8.0.0` final (2026-07-01); the **v9 line opened** (auto-bumped from
a `breaking-change`-labeled PR) and ran through `v9.0.0-rc.2` to **`v9.0.0` final** (2026-07-24,
on the `release/v9.0` branch, later `v9.0.1` on 2026-08-06 - **the current stable pin**); the
**v9.1 line opened** at `9.1.0-beta.0` when `v9.0.0-rc.1` was cut and ran to `9.1.0-beta.8`; on
2026-07-23 that same dev line was **mechanically re-rooted as `10.0.0-beta.*`** by the
breaking-change detector, so `v9.1.0` was never tagged; the **v10 line** ran to
`v10.0.0-beta.7`, then stabilization forked to `release/v10.0` and stopped at `v10.0.0-rc.3`
(**`v10.0.0` final was never tagged either**) while `main` opened `10.1.0-beta.1/2`; and on
2026-08-05 **that** line was re-rooted in place as `11.0.0-beta.*`, so `v10.1.0` was never
tagged. This section keeps
the full v7 history below (still useful context), the **v7.2.0-beta.5 -> v8.0.0-beta.9 delta**
(the v7->v8 major boundary), the **v8.0.0-beta.9 -> v8.0.0-beta.14 delta**, the
**v8.0.0-beta.14 -> v9.0.0-beta.10 delta** (the v8->v9 major boundary), the
**v9.0.0-beta.10 -> v9.0.0-beta.16 delta**, the **v9.0.0-beta.16 -> v9.0.0-beta.18 delta**,
the **v9.0.0-beta.18 -> v9.1.0-beta.8 delta**, the **v9.1.0-beta.8 -> v10.0.0-beta.7 delta**,
and finally the **v10.0.0-beta.7 -> v11.0.0-beta.2 delta** (the current tag - most important for
a v11 reader) at the very end.

**The v6 -> v7 breaking change.** `feat!: make dataset object store access base-aware`
(PR #6647, commit `456198cd`), immediately followed by the automated bump to `7.0.0-beta.1`.
Object-store access is now scoped to a dataset *base* instead of a flat global path -
groundwork for multi-base storage (hot/cold tiering, multi-region, shallow clones). The
related `refactor!: vendor the tokenizer stack into lance` (PR #6512) is what created the
`lance-tokenizer` crate.

**MemWAL / LSM** is the dominant v7 theme: the WAL appender/tailer primitives (PR #6669), the
`shared-memory://` object-store scheme, `ShardWriter` manual-compaction APIs (#6766), a
builder-style MemWAL init API (#6815), append-only tables without primary keys (#6848), and
`ShardSpec` renamed to `ShardingSpec` (#6813). See section 10 - MemWAL is experimental.

**Lance-native in-memory HNSW** for the MemWAL shard writer (PR #6795).

**Indexes** - segmented btree indexes (#6605), zonemap index segments (#6593), incremental /
segmented FTS index merging (#6737, #6790), distributed bitmap index build (#6598), segmented
inverted index build and search (#6305), FTS exec internals exposed for distributed planning
(#6648). The geo / RTree index and the `lance-geo` crate; an RTree index-type parsing fix
(#6568).

**Branches and tags** - branch/tag metadata maps and tag timestamps (PR #6364); the `tree/`
and `_refs/branches/` layout (section 7).

**Commits** - manifest version hint for fast latest-version lookup (PR #6752); uncommitted
delete transactions exposed (#6781); the `Clone` transaction (shallow / deep).

**Spec restructuring** - the lakehouse spec was formally split into separate catalog /
namespace / table / index specifications (PR #6750x), reflected in `docs/src/format/`.

### The v7.1.0-beta.1 delta

The 19 commits in `v7.0.0-beta.16..v7.1.0-beta.1` are mostly bug fixes and internal
performance work (serializable BTree/Bitmap/LabelList index caches, deterministic HNSW
graph builds, roaring range-iterator speedups). The user-facing additions:

- **Materialized-view namespace API** (PR #6891) - `create_materialized_view` and
  `refresh_materialized_view` on the `LanceNamespace` trait. A materialized view is a
  query / UDTF / chunker backed by a stored spec, with an optional initial refresh. The
  `RestNamespace` implements both (`POST /v1/materialized_view/{id}/create` and
  `/refresh`); `DirectoryNamespace` and the default trait return `not_supported`.
- **Typed vector index details** (PR #6099) - the `VectorIndexDetails` and
  `HnswParameters` messages moved into `protos/index.proto` (section 11.1).
- **Multi-base `write_fragments`** (PR #6855) - multi-base storage config is now reachable
  from the Python and Java `write_fragments` API, not just Rust.
- **Granular tracing targets** (PR #6853) - `pylance` emits trace events under a
  `lance::events::` prefix so they filter separately from log records; new
  `lance::dataset_events` and `lance::object_store::throttle` targets. Example:
  `LANCE_LOG="warn,lance::events::object_store::throttle=info"`
  (`docs/src/guide/performance.md`).
- **MemWAL** - a sharding evaluator (PR #6854), L0 flushed-generation dataset caching
  (PR #6816), and exact primary-key dedup fixes for LSM point lookup and vector search
  (PR #6881).

### The v7.1.0-beta.2 delta

Seven commits in `v7.1.0-beta.1..v7.1.0-beta.2`, mostly MemWAL correctness work plus one
workspace refactor:

- **New `lance-select` crate** (PR #6879, commit `52c6ac34`) - mask code (`RowAddrMask`,
  `NullableRowAddrMask`, `RowIdMask`, set types, `bitmap_to_ranges`/`ranges_to_bitmap`) and
  scalar-index expression-result types (`IndexExprResult`, `NullableIndexExprResult` with
  their `Not`/`BitAnd`/`BitOr` boolean algebra) were extracted from `lance-core` and
  `lance-index` into `rust/lance-select/`. Downstream filtering code and the new
  `index_expr_result` / `row_addr_mask` benches can now depend on masks without pulling in
  either larger crate.
- **MemWAL: build secondary indexes when flushing the active memtable** (PR #6901, commit
  `cee7d32f`) - `MemTableFlushHandler` previously called `flush`, persisting the data file
  and bloom filter but **building no secondary indexes**, and never received the shard's
  `index_configs` in the first place. Over flushed generations this made flushed vector rows
  invisible to `fast_search()` (a correctness bug for KNN, not just perf), and point lookups
  fell back to a full scan instead of routing through a scalar index. The fix threads
  `index_configs` into the handler and calls `flush_with_indexes` when any index is
  configured, while keeping plain `flush` when none are so empty-index shards avoid an extra
  pass.
- **MemWAL: per-source PK-hash block-list post-filter** (PR #6899, commit `77db998a`)
  fixes a stale-read in LSM vector search. `LsmGlobalPkDedupExec` (introduced in #6881) is
  exact only over candidates each source surfaces; if a primary key's fresh row is pushed
  out of its source's top-k by closer rows, the dedup never sees it and a superseded copy
  from an older generation can win. The fix makes staleness a per-source PK-hash post-filter
  (`PkHashFilterExec`) applied to each source's KNN *before* the cross-source union, so a
  stale row never reaches the merge. Each generation's membership is an
  `Arc<HashSet<u64>>` of PK hashes (`compute_pk_hash`, the same hash the dedup nodes use).
- **Docs** - new integrations landing page at `docs/src/integrations/index.md` (PR #6915);
  Java doc URL updated from `com.lancedb` to `org.lance` (#6467).

Note: there is **no Tantivy-FTS-removal commit in the v7 range**. Lance FTS at this tag is
already its own native inverted-index implementation; the tokenizer vendoring (#6512)
predates `v7.0.0-beta.1`. Do not attribute a Tantivy removal to v7.

### The v7.1.0-beta.2 -> v7.2.0-beta.5 delta

66 commits, **no breaking change** (no `!:` commit, no `BREAKING CHANGE` footer), **no new
crate** (still 24), **no new transaction op** (still 15), no proto change. User-facing
additions:

- **ICU FTS tokenizer** (PR #6956) - `base_tokenizer="icu"`, ICU4X dictionary segmentation
  with bundled data, no external model. A PR making ICU the default (#6968) was reverted
  (#7006); the default base tokenizer stays `simple`. See section 11.3.
- **Scalar-index fast search** (PR #6784) - `fast_search` routes through scalar/BTREE-indexed
  fragments and skips unindexed ones (not on legacy file version). See section 11.2.
- **Batched vector queries** (PR #6828) - `Scanner::nearest` takes a batch of query vectors
  and exposes a synthetic 0-based `query_index` column. See section 11.1.
- **Streaming IVF k-means** (PR #6913) - `streaming_sample_rate` / `streaming_coreset_rate` /
  `streaming_refine_passes` for bounded-memory IVF training. See section 11.1.
- **Arrow view-type support** (PR #6985) - `Utf8View` / `BinaryView` now encode (fixes an
  encoder `todo!()` panic) and coerce correctly in filters.
- **HuggingFace `download_mode`** (PR #7022) - storage-option keys `hf_download_mode` /
  `download_mode` select the OpenDAL `http` (default) or `xet` backend on the existing
  `hf://` provider; not a new object-store scheme.
- **MemWAL LSM local-scoring FTS** (PR #6951) - `LsmScanner::full_text_search(column, query, k)`,
  contained entirely in the `mem_wal` module.
- Dependency bumps: pylance `lance-namespace>=0.8.0,<0.9` (PR #7031), `opendal 0.57`
  (PR #7018), `jieba-rs 0.10` (PR #6955).
- Doc clarification: RaBitQ (RQ) is documented 1-bit-only with multi-bit as future work, and
  the RQ metadata schema gained a `code_dim` field (`docs/src/format/index/vector/index.md`).

Unchanged and reverified at this tag: 15 transaction ops, the scalar/vector index-type set,
all `protos/*.proto`, file-format `version.rs`, `rust-version 1.91.0`, `resolver 3`, edition
2024, `CommitConfig num_retries=20`, MemWAL still experimental.

### The v7.2.0-beta.5 -> v8.0.0-beta.9 delta (major-version boundary)

86 commits. This is a **major version bump** whose unifying theme is moving *every* index
build onto one segment-based lifecycle. **Six breaking changes** (`!:` commits):

- **`feat!: migrate bitmap to index segment based`** (PR #6869) - the defining v8 change.
  Bitmap now flows through the segment workflow; the old public Python Bitmap shard path
  (`create_scalar_index(..., fragment_ids=)` + `merge_index_metadata(..., "BITMAP")`) "is no
  longer exposed; callers should use the segment workflow instead." `execute_uncommitted`
  writes canonical `bitmap_page_lookup.lance` segment roots
  (`rust/lance-index/src/scalar/bitmap.rs:59`).
- **`refactor!: remove index segment builder`** (PR #6997) - the `IndexSegmentBuilder` API
  was removed from Rust, Python, and Java; staged publishing routes through
  `create_index_uncommitted` / `execute_uncommitted` + `merge_existing_index_segments` +
  `commit_existing_index_segments`. `build_all()` and `target_segment_bytes` size-based
  grouping are gone with no direct replacement (`docs/src/guide/migration.md` "7.2.0").
- **`refactor(index)!: move distributed BTree build to segmented index framework`** (PR #7013)
  - distributed BTree now uses the same `create_index_uncommitted` / merge / commit path.
- **`feat!: return write summaries from file writers`** (PR #7096) - `finish()` changed from
  `Result<u64>` to `Result<FileWriteSummary>` (`{ num_rows: u64, size_bytes: u64 }`,
  `rust/lance-file/src/writer.rs:54-58,768`). Python `LanceFileWriter.finish` keeps its
  row-count return.
- **`fix(python)!: derive index type from details`** (PR #6903) - `describe_indices()` "now
  reports nested and special-character field names as full field paths (e.g. `meta.lang`)
  instead of just the leaf name"; `list_indices()` is a thin typed `IndexInformation` wrapper
  that no longer opens each index; the `load_indices()` Python binding was removed.
- **`perf!: avoid listing index files after writes`** (PR #7129) - `IndexFile` metadata is
  propagated from writer/builder APIs into manifest metadata instead of listing index
  directories after writes (a writer/builder trait-level break).

Net-new user-facing features:

- **`lance-derive` crate** (PR #6229) - `#[derive(DeepSizeOf)]` for Arrow-aware memory
  accounting, replacing the external `deepsize` crate. Crate workspace 24 -> 25. See section 2.
- **FM-Index scalar index** (`docs/src/format/index/scalar/fmindex.md`,
  `protos/index.proto` `FMIndexIndexDetails`) - BWT substring/prefix/regex search on raw
  bytes via the Segmented Index architecture (`num_segments`). See section 11.2.
- **Multi-bit IVF_RQ** (PR #7038) - RaBitQ `num_bits` 1..=9; ex-code bits in `__ex_codes`
  (+ `__add_factors_ex` / `__scale_factors_ex`). **Raw-query RQ search** (PR #7078) adds the
  `query_estimator` field and `__error_factors` lower-bound pruning. See section 11.1.
- **Independent per-worker vector index models** (PR #7148) for distributed builds; zone-map
  segments now mergeable via `merge_existing_index_segments` (PR #7128); HNSW segment merge
  (PR #7178); segmented BTree merge (PR #6889). See section 12.
- **Volcengine TOS** (`tos://`) and feature-gated **GooseFS** (`goosefs://`, PR #7034) object
  stores. See section 13.
- Smaller: `tracked_files` / `all_files` on `LanceDataset` (PR #6011); multi-segment FM-Index
  build config; `add_columns` UDFs no longer require pandas (PR #7131); FTS flat match now
  searches all unindexed fragments (PR #7188); AVX-512 distance tables compiled for the
  target CPU (PR #7121).
- Dependency facts: arrow 58, datafusion 53, opendal 0.57, jieba-rs 0.10,
  lance-namespace-reqwest-client 0.8.2; pylance `lance-namespace>=0.8.0,<0.9`.

Unchanged and reverified at `v8.0.0-beta.9`: **15 transaction ops** (`protos/transaction.proto`
diff empty); file-format `version.rs` (`Next => 2.3`, `#[default]` still `V2_1`, no 2.4 - so
section 3 holds unchanged); `CommitConfig num_retries = 20`
(`rust/lance-table/src/io/commit.rs:1530`); the feature-flag bits; the
`ConditionalPutCommitHandler` routing; `rust-version 1.91.0`, `resolver 3`, edition 2024;
MemWAL docs and system-index docs byte-identical; MemWAL still experimental.

### The v8.0.0-beta.9 -> v8.0.0-beta.14 delta

31 commits, **two breaking changes** - both vector/RaBitQ. No new crate (still 25), no new
transaction op (still 15), no file-format change.

- **`feat(vector)!: add approx mode for RaBitQ search`** (PR #7179) - a public
  `approx_mode` with values `fast` / `normal` / `accurate` for vector search "when the backing
  index supports it" (commit `e25620710`), threaded through the Rust scanner, Python query
  parsing, and ANN proto serialization. **Breaking proto change**: the ANN query proto now
  carries `VectorApproxMode approx_mode` (`protos/ann.proto:16,45`) - regenerate any consumer
  that matches the serialized ANN proto. See section 11.1.
- **`perf(vector)!: add dedicated SIMD kernels for RaBitQ ex-code reranking`** (PR #7205,
  `rust/lance-index/src/vector/bq/ex_dot.rs`).
- **IVF_RQ default `target_partition_size` is now 4096** (was the generic fallback, PR #7273).
- **Cleanup explain API** (PR #7147) - `Dataset::cleanup(policy)` splits into `explain()`
  (returns a `CleanupExplanation`, a dry run) and `execute()`. See section 7.
- **Object-store docs** (PR #7151) - the guide gained full Tencent COS and GooseFS config
  sections (`docs/src/guide/object_store.md:252,306`); GooseFS is no longer undocumented. See
  section 13.
- **Smaller adds**: Python zonemap segment builds exposed (PR #7177); per-query I/O metrics
  (`bytes_read` / `iops` / `requests`) on `ANNSubIndex` / `ANNIvfPartition` in EXPLAIN ANALYZE
  (PR #7204); branch-aware version ops in the Directory/REST namespaces (CreateTableBranch /
  ListTableBranches / DeleteTableBranch, PR #7166); enriched `IndexContent` fields in dir
  namespace `ListTableIndices` (PR #7109).
- **Fixes**: resolve Blob v2 external URIs and clean failed writes in `add_columns`
  (PR #7152); coerce filter literals for dictionary-encoded columns (PR #7003);
  composite-key `merge_insert` probes every indexed key column (PR #6878).
- **Removals**: `table_version_storage_enabled` and the `__manifest`-backed table-version path
  removed - version ops now use `_versions/` exclusively (PR #7222); brotli dropped from the
  dependency graph (PR #7270).
- **Dep pins**: `lance-namespace-reqwest-client` 0.8.2 -> 0.8.4; pylance `lance-namespace`
  `>=0.8.0,<0.9` -> `>=0.8.5,<0.9`. arrow 58 / datafusion 53 / opendal 0.57 / jieba-rs 0.10
  unchanged.

Unchanged and reverified at `v8.0.0-beta.14`: 25 crates; 15 transaction ops; file-format
`version.rs` (`Next => 2.3`, `#[default] V2_1`, no 2.4); `CommitConfig num_retries = 20`
(`rust/lance-table/src/io/commit.rs:1550`); `rust-version 1.91.0`, `resolver 3`, edition 2024;
feature-flag bits; `ConditionalPutCommitHandler` routing.

### The v8.0.0-beta.14 -> v9.0.0-beta.10 delta (v8 -> v9 major boundary)

129 commits. A **light major bump** - structurally v9 is nearly identical to v8. The major
version was auto-triggered by `ci/check_breaking_changes.py` (GitHub `breaking-change`-label
detection), fired by two PRs merged before the 2026-06-22 bump: the Python 3.9 drop (#7345)
and the `alter_columns` fail-fast cast (#7158). The FMIndex rename (#7397) carries the label
too but merged after the bump, so it rode the already-bumped 9.0.0 series rather than
triggering it. **Three breaking changes:**

- **`refactor!: rename FMIndexIndexDetails to FMIndexDetails`** (PR #7397) - proto message
  `protos/index.proto:251` `FMIndexDetails {}` (was `FMIndexIndexDetails`); Rust type
  `pb::FmIndexDetails`; the `get_plugin_name_from_details_name` `fmindex`->`fm` special-case
  was deleted. Author's note: "This change would be a breaking change to any existing FM
  indexes!" - existing FM indexes become unreadable. See section 11.2.
- **Drop Python 3.9** (PR #7345) - `python/pyproject.toml` `requires-python = ">=3.10"`; the
  `Python :: 3.9` classifier removed; PyO3 abi3 floor raised `abi3-py39` -> `abi3-py310`;
  release wheels no longer built for 3.9. See section 2.
- **`fix(dataset)!`: `alter_columns` cast fails fast with an attached index** (PR #7158) -
  previously a cast silently dropped/invalidated the index; now it errors and you must
  `drop_index()` first. See section 6.

**Removal (Rust API, not conventional-`!`):** `as_vector_index` removed from the public
`Index` trait (PR #7392) - callers downcast via `as_any()`. See section 11.1.

**Net-new features:**

- **Hamming clustering** (PR #7379) - SIMD near-duplicate detection over 64-bit binary
  hashes (`pairwise_hamming_distance`, `UnionFind`, `hamming_clustering_for_ivf_partition`).
  See section 11.1.
- **COUNT(*) pushdown on stable-row-id datasets** (PR #7360) - the fast path no longer falls
  back to a full scan when stable row IDs are enabled. See section 11.1.
- **Per-column blob size thresholds** (PR #7269) - `lance-encoding:blob-inline-size-threshold`
  / `...-dedicated-size-threshold`; appends with a different threshold are rejected. See
  section 3.5.
- **Tunable 32k miniblock chunks** via `LANCE_MINIBLOCK_MAX_VALUES` (PR #7356; default still
  4096). See section 3.3.
- **`icu/split` FTS tokenizer** (PR #7474) and **mixed-language stop words** (PR #7324). See
  section 11.3.
- **Distributed LabelList index builds** (PR #7223). See section 12.
- **ngram index accelerates regex + infix LIKE** (PR #7139). See section 11.2.
- `alter_columns` **Dict <-> value-type casts** (PR #7289, section 6); cleanup-explain
  exposed to **Python and Java** (PR #7248, section 7); Python **fragment-reuse remap +
  delete-by-offset** (PR #7438); v2 file writer/reader support **columns of unequal length**
  (PR #7406); a `SpillStore` trait with local-disk impl (PR #7311); a versioned cache-codec
  envelope (PR #7163).

**Notable fixes:** compaction rejects `defer_index_remap` with stable row IDs (#7468);
nested legacy blobs rejected in v2.2 and blob v2 supported in nested structs (#7278, #7281);
`merge_insert` no longer drops matches when a leading payload column is all-null (#7251); SQ
offset accounted for in dot distance (#7481); manifests >5 GB via size-aware copy (#7047);
double percent-encoding in object-store paths resolved (#6643/#6695).

**Dependency changes:** `lance-namespace-reqwest-client` 0.8.4 -> 0.8.6 (#7254); `itertools`
0.13 -> 0.14 (#7424). The pylance runtime pin `lance-namespace>=0.8.5,<0.9` is unchanged.

Unchanged and reverified at `v9.0.0-beta.10`: **25 crates**; **15 transaction ops**
(`protos/transaction.proto` unchanged); file-format `version.rs` (`Next => 2.3`,
`#[default] V2_1`, no 2.4); `CommitConfig num_retries = 20`
(`rust/lance-table/src/io/commit.rs:1550`); `rust-version 1.91.0`, `resolver 3`, edition 2024;
arrow 58 / datafusion 53 / opendal 0.57 / jieba-rs 0.10; feature-flag bits;
`ConditionalPutCommitHandler` routing; MemWAL still experimental.

### The v9.0.0-beta.10 -> v9.0.0-beta.16 delta

58 commits. **One breaking change**; no new crate (still 25), no new transaction op (still 15),
no file-format change, no dependency-pin change. **`v8.0.0` final also shipped** in this window
(tag `v8.0.0`, commit `15f2ff594`, 2026-07-01) - use it as the stable pin (section intro).

**Breaking change:**

- **`feat(fts)!: make v2 the default index format`** (PR #7512) - newly created FTS / inverted
  indexes default to on-disk **format v2**; `LANCE_FTS_FORMAT_VERSION` no longer controls new
  indexes; pass `format_version=1` for older-reader compatibility. Existing v1 indexes stay
  queryable and are maintained as v1. See section 11.3.

**Net-new features:**

- **Blob read-API rework** (PR #7530, #7558) - `read_blobs` is now the primary full-payload
  API, `take_blobs` is for streaming/seeking, `scanner(blob_handling="all_binary")` reads blobs
  as Arrow binary; documented auto-tiering defaults (16 KiB inline / 2 MiB dedicated) and a new
  `lance-encoding:blob-pack-file-size-threshold` field key (PR #7322). `dataset.update()` now
  works on blob-encoded columns (PR #7579). See section 3.5.
- **Per-base `storage_options`** via `base_<id>.<key>` keys (PR #7608); **multi-base
  merge-insert** with target-base routing (`MergeInsertBuilder::target_bases`, round-robin new
  fragments, `DataFile.base_id` stamped; PR #7610). See sections 13 and 6.
- **ZoneMap `value_range`** min/max without a scan (PR #7463); **BTREE + ZONEMAP accept
  `LargeUtf8`** (PR #7525). See section 11.2.
- **Prefiltered LSM vector + FTS search** across base/flushed/in-memory sources (PR #7138). See
  section 10.
- **Schema evolution allows all-null `Map` columns** (PR #7462). See section 6.
- **DirectoryNamespace** now implements `update_table` / `delete_from_table` (PR #6923) and
  `alter_transaction` (PR #6974) - previously `not_supported`.
- Compaction `RowAddrRemap` structure to avoid remap HashMap OOM (PR #7237); single-flight
  scalar-index opens (PR #7464); session-cached manifest reuse on open (PR #7576).

**Notable fixes:** `DataReplacement` commits preserve `DataFile.base_id` on multi-base datasets
(#7609); blob descriptor views kept opaque - the reader no longer recurses into `position`/
`size` child fields (#7618); stable row-id index tolerates sparse/overlapping chunks (#7480);
ngram posting-list writes chunked by byte size to avoid i32 offset overflow (#7607); scheduler
deadlock on same-priority chunks fixed (#7588).

Unchanged and reverified at `v9.0.0-beta.18`: **25 crates**; **15 transaction ops**
(`protos/transaction.proto` unchanged); file-format `version.rs` (`Next => 2.3`,
`#[default] V2_1`, no 2.4); `CommitConfig num_retries = 20`; `rust-version 1.91.0`,
`resolver 3`, edition 2024; arrow 58 / datafusion 53 / opendal 0.57 / jieba-rs 0.10 /
itertools 0.14 / lance-namespace-reqwest-client 0.8.6; pylance `lance-namespace>=0.8.5,<0.9`;
feature-flag bits; `ConditionalPutCommitHandler` routing; MemWAL still experimental.

### The v9.0.0-beta.16 -> v9.0.0-beta.18 delta

36 commits. **No breaking changes**; no new crate (still 25), no new transaction op
(`rust/lance/src/dataset/transaction.rs` untouched), no file-format change. Mostly fixes
plus three additive features:

- **pylance prewarm gains segment selection** (#7677) - warm only chosen index segments.
- **Object-store metrics published via the `metrics` crate** (#7533).
- **RLE v2 run-length widths** (#7376), with width selection by encoded size (#7636).

**Docs:** the performance guide gained a **Fragment Sizing** section (#6606); cleanup and
automatic-cleanup documentation added to the read-and-write guide (#6546); a new
`guide/observability.md` page; MemWAL format spec updated (#7655). All reproduced in this
skill's `references/docs/` mirror.

**Notable fixes:** FTS list columns indexed as row documents (#7656); fuzzy
`max_expansions` enforced globally across index partitions instead of per-partition; FTS
tail-partition merge split by the worker memory budget and a `num_tokens`-only DocSet
cached on `LazyDocSet` (#7600); MemWAL writer fenced on WAL persistence failure (#7547)
and slice-aware memtable flush-threshold size estimate; Arrow-JSON -> Lance-JSON
conversion fixed across the merge/update, single-fragment-create, and merge-insert
full-fragment-rewrite paths (`take` now returns Arrow JSON, #7470/#7471);
`object_store::Error::NotFound` mapped to `Error::NotFound` instead of a generic IO
error; PQ `num_bits` respected for numpy codebooks (#7586); hang fixed in
`train_streaming_coreset_ivf_model` (#7676).

### The v9.0.0-beta.18 -> v9.1.0-beta.8 delta

127 commits straddling the tail of the 9.0.0 beta line (through `rc.2`) and the new 9.1.0 dev
line. The 9.1.0 minor bump is **automatic release-train cadence**, not a breaking change: when
`v9.0.0-rc.1` was cut, `main` advanced to `9.1.0-beta.0`. **One breaking-labeled PR** in the
window: FTS `block_size` (#7466, below). Structural changes reverified at `v9.1.0-beta.8`:
**26 crates** (new `lance-index-core`, #7713); **16 transaction ops** (new `DataOverlay`);
**datafusion 53 -> 54** (#7793), geodatafusion 0.4 -> 0.5, build toolchain 1.91 -> 1.97 (#7712,
MSRV `rust-version` unchanged at 1.91.0). Unchanged: arrow 58, opendal 0.57, jieba 0.10,
`lance-namespace-reqwest-client` 0.8.6, itertools 0.14, edition 2024, resolver 3,
`lance-arrow-scalar =58.0.0`; `CommitConfig num_retries = 20`; file-format `version.rs`
(`Next => 2.3`, `#[default] V2_1`); Python min 3.10 (3.14 added, #7728).

**Breaking (labeled):**
- **FTS configurable posting `block_size`** (#7466) - `InvertedIndexParams` gains `block_size`
  (128/256, default 128, 512 rejected). `block_size=256` and the code analyzer require FTS
  on-disk **format v3** (#7866). Sections 11.3.

**Additive features:**
- **Data Overlay Files** (#7535 write path, #7536 read path, #7540 Python commit op) - the new
  16th transaction op `DataOverlay`, feature flag 64, spec `data_overlay_file.md`. Cell-level
  `(offset, field)` updates without rewriting base data files; **unstable**, env-gated by
  `LANCE_ENABLE_UNSTABLE_DATA_OVERLAY_FILES` (release builds refuse overlay datasets).
  Compaction folds fragments over an overlay-count limit (#7772). Section 5.5.
- **Sparse structural pages** (#7889) - first real 2.3 encoding; `structural-encoding=sparse`.
  Section 3.1.
- **Exact `IS NULL`** for ZONEMAP and BLOOM_FILTER via a new `null_bitmap`. Section 11.2.
- **Nested-field FTS** (#7686) index leaf fields like `data.text`; code-analyzer tokenizer
  (#7681); impact-skip / bulk MAXSCORE top-k / bulk conjunction FTS paths (#7602/#7603/#7624);
  read inverted-index params without opening the segment (#7816). Section 11.3.
- **OpenTelemetry metrics for Python** (`instrument_lance_metrics`, `pylance[otel]`, #7537);
  zone-map seeds written into data-file footers during append (#7427).
- **AWS creds via `AssumeRoleWithWebIdentity`** to avoid role chaining (#7757); batch/list
  blob reads (#7864, #7664) and a bulk packed-blob writer (#7743); MemWAL flush-interval
  ticker (#7894) and Python/Java shard delete (#7649, #7688); wider hamming hashes and
  multi-segment hamming clustering (#7767, #7758); RLE child-buffer zstd compression (#7663);
  cached file-metadata APIs on `FileFragment` (#7820); `TableProvider` write inputs for
  `merge_insert`/`insert` (#7368); runtime SIMD dispatch for pre-Haswell x86_64 from-source
  builds (#6630).

**Other:** writes now reject system column names (#7797). The TensorFlow integration moved
from built-in to an external `lance-tensorflow` package, and the image array decoder/encoder
is now Pillow-only (not vendored in this skill's docs mirror - integrations mirror is
`datafusion.md` only).

### The v9.1.0-beta.8 -> v10.0.0-beta.7 delta

78 commits. The major bump is **mechanical**, not a redesign: `ci/publish_beta.sh` re-roots at
`MAJOR+1` on any `breaking-change`-labeled PR, and `fb88621f8 chore: bump to 10.0.0-beta.1 based
on breaking change detection` landed immediately after `3a72f8a61 fix(blob)!: preserve null
selections across blob APIs (#7903)`. Only one bump happens per series, so the two later `!`
commits rode the already-bumped line. Structural invariants **all reverified unchanged**:
26 crates (no crate added or removed), 16 transaction ops, `CommitConfig num_retries = 20`,
file-format `version.rs` (`Next => 2.3`, `#[default] V2_1`), feature-flag bits (newest still 64,
data overlay), MSRV 1.91.0, toolchain 1.97.0, edition 2024, resolver 3, arrow 58 /
datafusion 54 / opendal 0.57 / jieba 0.10 / itertools 0.14 /
`lance-namespace-reqwest-client` 0.8.6, Python 3.10-3.14.

**Breaking (four):**

- **`fix(blob)!: preserve null selections across blob APIs`** (#7903) - the bump trigger. Every
  selection API returns one result per request, nulls as `None` instead of omitted. Rust,
  Python, and Java signatures all change. Section 3.5.
- **`perf(cache)!: use fixed-size cache keys`** (#7878) - opaque 16-byte BLAKE3 keys
  (`CACHE_KEY_FORMAT = "blake3-128-v1"`); all warm/persisted caches cold-miss, no legacy
  fallback; prefix-invalidation and key-inventory APIs removed. Section 9.4.
- **`perf(compaction)!: skip building row-address maps when index remapping is not needed`**
  (#7778) - `IndexRemapperOptions::create_remapper` becomes async and returns
  `Result<Option<Box<dyn IndexRemapper>>>`; compaction skips the `_rowid` scan and
  RoaringTreemap entirely for FRI-only or system-index-only datasets.
- **MemWAL rename** (#7943, #7957) - flushed generation -> SSTable, merge -> compaction, across
  spec, Rust, Python, Java, and protos. Wire-compatible, symbol-breaking, no shims. Section 10.

**Additive:**

- **`ConcreteFileVersion`** (#7879) exact file identity, unordered by design; manifests reject
  selector aliases; `try_from_major_minor` / `to_numbers` removed; byte-exact writer fixtures
  with SHA-256 locks (#8019). Section 3.6.
- **Sparse structural pages auto-select** in the 2.3 writer (#7756). Section 3.1.
- **Segment-native BLOOMFILTER / RTREE / NGRAM / LABEL_LIST** (#7925, #7932, #7244, #7884);
  `IndexSegment::new` 4 -> 6 params; merged segments inherit the minimum source
  `dataset_version`; concurrent LIST on segment commit, ~8x faster remote (#7657). Section 12.
- **ACORN-1 prefiltered HNSW** (#7927), opt-in via `approx_mode="fast"`, with a documented
  recall regression on uniform-random masks. Section 11.1.
- **FTS**: `total_tokens` metadata key and `bm25_search` removal (#7863),
  `LANCE_FTS_SEARCH_CHUNK` (#7950), top-k row-id resolution 26x (#7897), deterministic tie
  order (#8073), segment-uuid-scoped exec nodes (#7976). Section 11.3.
- **Data-overlay/index correctness** (#7549, #7926, #7918) - index results exclude
  overlay-superseded rows. Sections 5.5 and 9.1.
- **quick_cache** as the default index and metadata cache backend (#7953, #8013), with a
  per-shard admission ceiling that silently refuses oversized entries. Section 9.4.
- Cross-store `deep_clone` via `CommitBuilder::with_source_store` (#7545); commit-retry backoff
  overflow capped at `MAX_SLOTS = 128` (#7883); external-manifest finalization always HEADs
  (#7964); `memory://` `DatasetNotFound` fix (#8068); tokio-shutdown panic becomes an I/O error
  (#7478); `LANCE_CPU_THREADS` / `LANCE_IO_CORE_RESERVATION` validated (#7856); dir namespace
  surfaces throttles instead of `TableNotFound` (#7931) and honors `structured_query` FTS
  (#7592); Java `CacheStats` + `Session.metadataCacheStats()` (#7885); vector index append
  across heterogeneous segment models (#8047).

**Fixes worth knowing:** `Dataset::filter_deleted_ids` was wrong on stable-row-id datasets,
breaking `optimize_indices` (#7704); filtered scans and `add_columns(AllNulls)` returned a valid
struct with null children instead of a null struct on storage 2.1 (#8049); `LIKE ... ESCAPE ''`
was treated as no-escape and `ESCAPE 'ab'` silently truncated - both now error (#7810);
`list_indices` no longer backtick-quotes ordinary column names (#7503).

**Security:** `quinn-proto` 0.11.14 -> 0.11.16 via Dependabot security alert, applied to the
root workspace, `/python`, and `/java/lance-jni` (#7983, #7984, #7982) - "proto: yield error on
too many gaps in assembler". Plus bulk Dependabot cargo-group bumps (38 root, 28 python,
27 java-jni).

### The v10.0.0-beta.7 -> v11.0.0-beta.2 delta (current tag)

128 commits. The bump is again **mechanical** - nine PRs carried the `breaking-change` label
(#8024, #8025, #8026, #8051, #8095, #8159, #8172, #8188, #8206), of which only two carry `!` in
the subject, and the bot re-rooted `10.1.0-beta.2` as `11.0.0-beta.1` in place. Structural
invariants **all reverified unchanged**: **26 crates** (the `rust/` `Cargo.toml` inventory is
byte-identical across the two tags), **16 transaction ops** (`protos/transaction.proto` is
byte-identical), `CommitConfig.num_retries` **20**, file-format enum `next => 2.3` / default 2.1
with no 2.4, manifest feature flags 1-128 unchanged, MSRV 1.91.0 / toolchain 1.97.0, Python
3.10-3.14, arrow 58 / datafusion 54 / `object_store` 0.13.2 / jieba 0.10 / blake3 1.8.5, and the
`=58.0.0` pins on `lance-arrow-scalar` / `lance-arrow-stats`. The only proto change in the whole
range is `protos/index_old.proto` (+17 lines).

**Breaking (labeled):**

- **#8206** - fragment ids became a dataset-lifetime high-water mark; overwrite no longer
  restarts at 0, overwrite fragments with deletion files are rejected, duplicate ids block all
  commits. A format invariant, not just an API change. Section 5.3.
- **#8024 / #8025 / #8026** - the exact-version reader/writer composition: `ReaderProjection`
  constructors became free functions, `FileReader::version()` and
  `Dataset::storage_version_or_default()` return `ConcreteFileVersion`,
  `FileReader::supports_projection` and `open_writer` were removed, and
  `lance-encoding::version` was deleted with no re-export. Section 2.1.
- **#8051** - `force_seal_active` returns `SealFence`. **#8095** -
  `MemIndexConfig::detect_index_type` replaced by `is_maintainable_index_type` + `MemIndexKind`.
  Section 10.
- **#8159** - `CacheBackend::deep_size_of_entries`; reported cache sizes shrink. Section 9.4.
- **#8172** - `DataBlockBuilder::append` is fallible; corrupt variable-width offsets now error
  instead of panicking. **#8188** - HNSW `try_with_capacity`, `m >= 4` enforced, persisted level
  layout corrected; different graphs and recall. Sections 2.1 and 11.1.

**Breaking (unlabeled but source-breaking - the #7877 series):** #8020 removed
`lance_io::encodings` and moved `lance-file::previous` to `versions::v1`; #8021 deleted the
`lance-encoding::previous` public encoder surface; #8023 turned `FileWriter` into an enum and
removed all its constructors plus two `FileWriterOptions` fields; #8038 added a context parameter
to `MiniBlockCompressor::compress`. Also `#8141` removed `GraphBuilderStats`, and `#7788` added a
third parameter to `load_segments`. Section 2.1.

**Net-new:**

- **FTS document granularity** (#7788) - `DocumentGranularity` ROW/LIST_ELEMENT,
  `posting_format_version`, `_doc_index` column, and a third FTS-v3 trigger. Section 11.3.
- **Compound FTS scoring core** (#8092, #8093, #8094, #8131, #8299) - Boolean/Phrase/Boost
  composition, public `CompoundQueryExec`, cost-ordered conjunctions, `AND` as scoring `MUST`.
  Section 11.3.
- **Zone maps**: `has_null_bitmap` making `IS NOT NULL` scan-free (#8088) and all-type support
  including nested (#8017). Section 11.2.
- **Manifest transaction spilling** above 20 MiB (#7881, ~50% manifest shrink measured).
  Section 9.1. **Pluggable cache backends** with a `moka://` URI form (#7683). Section 9.4.
- **`aws_provider_scheme`** token/ecs/irsa (#8103); **`goosefs://` via
  `ConditionalPutCommitHandler`** (#8134) with a mixed-version overwrite hazard; multipart
  part-identity retry fix (#8174) and removal of `LANCE_CONN_RESET_RETRIES`. Section 13.
- **Encoding performance**: exact decode-buffer preallocation via `decoded_size_bytes` (#8091,
  index-cache weight down up to 74% on IVF_SQ, no on-disk change); a zero-copy typed view for
  inline bitpacking (#7696, 13-22% faster unchunk); `O(n*m)` fragment compares removed from
  `build_manifest` for Update/Delete (#8210); parallel doc-length preload on the cold deferred
  FTS search path (#8119).
- **Python**: pydantic auto-conversion in `write_dataset` plus
  `LanceDataset.from_pydantic_model(model_class, data, uri=None, **kwargs)` (#7383);
  `LanceFileWriteSummary` giving `LanceFileWriter` a `size_bytes` (#7876); `max_source_fragments`
  on `compact_files` for incremental compaction, also settable via the manifest config key
  `lance.compaction.max_source_fragments` (#8116); `blob_handling` on the SQL/DataFrame builder
  (#8087).
- **Java** got the biggest build-out of any binding: an OpenTelemetry metrics bridge
  (`org.lance.otel.LanceMetrics`, #8064 - the docs now say metrics are available "from the Rust,
  Python, and Java APIs"); scanner tuning via `ScanOptions` (`batchSizeBytes`, `ioBufferSize`,
  `fragmentReadahead`, `scanInOrder`) and a typed `MaterializationStyle` (#8288);
  `FragmentStatistics` (#8072); a typed `LanceException` replacing bare `RuntimeException`
  (#8184); and `IndexBuildProgress` callbacks (#8090).
- Minor: `QuantizationType` accepts `"RQ"` (#8214); HNSW greedy descent stops at level 1
  (#8035, +3.7% recall@10); `BlobV2Layout` classification helper (#8266); a
  `ConditionalPutCommitHandler` test matrix covering every routed scheme.

**Security / supply chain:** `rust-stemmers 1.2.0` -> **`frostem`** (#8183) - the unmaintained
crate's "Greek implementation can retain stale UTF-8 byte offsets after shortening a word, then
panic while slicing the shortened string." `frostem` is generated from current upstream Snowball
and exposes the same 18 algorithms. `strum` and the direct `goosefs-sdk` dependency were dropped;
`crc32c` left the lockfile and `opendal-http-transport-reqwest` entered it.
