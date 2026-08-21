---
name: lance-format
description: Deep reference for Lance v11 - the open columnar lakehouse format for multimodal AI - and its Rust crate workspace plus pylance. Covers the 2.x file format and structural encodings, the table format (manifests, fragments, transactions, OCC), vector / scalar / full-text indexes, MemWAL, schema evolution, time travel, namespaces, and object-store config. Use when building directly on the Lance crates or reading `.lance` datasets; this is the Lance format and engine (`lance-format/lance`), not the LanceDB product built on top of it.
metadata:
  version: "0.17.1"
  categories: "development, integrations"
  topics: "lance, columnar-format, vector-search, rust, lakehouse"
  upstream: "lance-format/lance@v11.0.0-beta.16"
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

This skill tracks **`v11.0.0-beta.16`** (the `lance-format/lance` git tag), the current
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
The canonical docs site is **`lance.org`**. Generated per-language SDK docs live at
`lance-format.github.io/lance-python-doc` for Python and
[javadoc.io](https://www.javadoc.io/doc/org.lance/lance-core/latest/index.html) for Java - the
matching `lance-format.github.io/lance-java-doc` path 404s.

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

Since `beta.6`, the transaction code moved too (#8053/#8054/#8056):
`rust/lance/src/dataset/transaction.rs` is **deleted**, replaced by a
`rust/lance-table/src/transaction/` module tree (`builder`, `conflicts`, `operation`, `proto`,
`manifest_build`, `validate`, `index_maintenance`, `row_version`, `update_map`). A
`lance::dataset::transaction` re-export shim survives and still carries `Operation`,
`Transaction`, `TransactionBuilder`, `RewriteGroup`, `UpdateMap` and friends, so the common
surface is unbroken - but anything importing a symbol the shim omits, or citing the old path,
needs retargeting.

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
| **v11** (current, `v11.0.0-beta.16`) | Fragment ids became a dataset-lifetime high-water mark; large internal reorganization of `lance-file` / `lance-encoding`; the first new manifest feature flag since v7. Delta below |
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

313 commits from `v10.0.0-beta.7`, with **14 `breaking-change`-labeled PRs**. Most structural
invariants held: **26 crates**, **16 transaction ops**, `CommitConfig.num_retries` **20**,
file-format enum still `next => 2.3` / default 2.1 (no 2.4), arrow 58 / datafusion 54, MSRV
1.91.0, Edition 2024, Python 3.10+.

**`references/changelog-v7-v11.md` has the full delta** - every PR citation, the per-tag
breakdown from v7 forward, the complete Python/Java surface, and each correctness fix with the
condition that triggers it. Load it for any "what changed / will this break me" question. What
follows is only what bites hardest.

**Five things that break you at v11:**

- **Fragment ids are a dataset-lifetime high-water mark** (#8206) - a *format* invariant, not
  just an API. Overwrite no longer restarts ids at 0, an overwrite fragment carrying a deletion
  file is rejected, and any commit producing duplicate ids is rejected - so datasets written by
  Lance 0.16 and earlier may still read but no longer commit. `dataset.get_fragment(0)` after an
  overwrite must read ids from the manifest. Section 5 - which also covers a resolution hazard on
  pre-0.10 unsorted manifests that can make a fragment-filtered index cover the wrong fragments.
- **The file-version types and reader/writer composition moved** (#8020-#8026) -
  `lance-encoding::version` deleted with no re-export; `LanceFileVersion` lost `PartialOrd`/`Ord`
  (#8027, #8028), so `v >= LanceFileVersion::Next` no longer compiles. `FileWriter` is now an
  enum with all constructors removed. Most of these break silently at compile time. Section 3.6.
- **Transaction code moved to `lance-table`** (#8053/#8054/#8056) - see the crate-workspace note
  above; the `lance::dataset::transaction` shim covers the common surface.
- **`Operation::Project` / `Merge` gained `preserves_nullability`** (#8347) - a nullability
  *tightening* must not set it, and such a projection now conflicts with any concurrent
  value-write. This closed a real hole where `alter_columns` could let a racing write land nulls
  unreadable under the tightened schema. Section 9.2.
- **The external-manifest protocol changed** (#8499) - object storage is authoritative, the
  external store's put-if-not-exists is a *reservation*, and a stored ETag must be **ignored**;
  a retained one makes readers reject a good manifest with `Manifest e_tag mismatch`. Section 9.

**The manifest feature flags changed** - the first new bit since v7.
`FLAG_MEM_WAL_INDEX_CATCHUP = 128` was added and `FLAG_UNKNOWN` moved 128 -> 256. Both reader
and writer must hold the bit or refuse the table, and **setting it is one-way**. Without it, a
missing `index_catchup` entry reads as "fully caught up", so an index-only query could answer
without the SSTables holding the newest rows. Section 7.

**Two `LANCE_*` env vars landed** (from the AMX work, #8540): `LANCE_DISABLE_AMX` (runtime kill
switch) and `LANCE_AMX_FP16_CC` (build-time compiler override). Grep trap: `LANCE_AMX_CFG_*` and
`LANCE_AMX_TILE_COUNT` are **C macros in `amx_fp16.c`, not env vars**, and `LANCE_FACTOR` is a
substring of `BALANCE_FACTOR` - a plain `LANCE_*` grep reports all four as if they were real.

**Worth knowing without reading the full delta:** FTS gained a document-boundary axis
(`DocumentGranularity`, #7788) whose `list_element` mode is a third trigger requiring FTS on-disk
format v3; transactions above **20 MiB** spill out of the manifest entirely (#7881); MemWAL
catch-up became derived rather than declared (#8481); transaction proto field 9
(`updated_fragment_offsets`) is deprecated for field 10 (#7432); and compaction gained row/byte
budgets plus fragment exclusion (#8235, #8532).

**Correctness fixes split by whether upgrading is enough.** Most are read-path only and heal on
upgrade. These do **not** - they need data rewritten or repaired: #8382 (variable-width offsets),
#8669 (JSON columns updated from string expressions), #8509 (re-run affected merges), #7703 and
#8539 (bad manifests already committed - validation is commit-time only), #8459 (a clobbered tag
is unrecoverable and undetectable), #8378 (data "written to a UNC URL" landed on the local
drive), #8482 (re-run the distributed FTS build). Conditions for each in
`references/changelog-v7-v11.md`.

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

**AMX-FP16** (#8540, beta.16) is the one v11 performance change that alters *results*, not just
speed: where it engages, IVF partition assignment becomes **exact instead of approximate**, so
recall improves *and* assignments differ from an older build. It is shape-gated (`float16` +
`dot`, `dimension >= 32`, `num_centroids >= 32`); everything else keeps the previous path.
`LANCE_DISABLE_AMX=1` disables it, but reverts assignment to the approximate path too - so an
index built with it set is not equivalent to one built without it.

Two cache facts to know before tuning anything remote: Lance has **no resident data cache** (a
`Session` holds only index and metadata caches, never decoded values, so repeated point reads
re-pay object-store IO), and one `Arc<Session>` shared via `DatasetBuilder::with_session` lets
datasets share it. Cold first search is dominated by paging indexes in - `prewarm_index` is the
remedy. All of this, with the build-time requirements, in `references/performance.md`.

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
