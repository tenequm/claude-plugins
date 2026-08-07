# Lance performance - combined reference

All official performance guidance from the Lance docs (`lance-format/lance@v11.0.0-beta.2`,
`docs/src/`) collected in one place (Part A, verbatim with sources noted), followed by
field-verified practices from running Lance against remote object storage (Part B).

Note on provenance: `docs/src/guide/performance.md` is byte-unchanged from `v9.1.0-beta.8`
through `v11.0.0-beta.2` - every number, default, and recommendation Part A quotes is current as
written, and the same holds for the other perf-bearing sections copied below
(`guide/json.md`, `format/table/transaction.md`, the full-text-search "Performance Tips"). The
"Performance changes not in the guide" subsections at the end of Part A are derived from source
and commit history rather than the guide - they are labeled as such because upstream has not
documented them in the performance guide yet.

Related verbatim references in this skill: `docs/` (the full official doc mirror, including
per-index storage/memory/training costs in `docs/format/index/scalar/fts.md` and
`docs/format/index/vector/index.md`, and the vector / full-text quickstarts with their
tuning sections under `docs/quickstart/`).

# Part A: Official guidance

## From `docs/src/guide/performance.md` (entire file)

# Lance Performance Guide

This guide provides tips and tricks for optimizing the performance of your Lance applications.

## Logging

Lance uses the `log` crate to log messages. Displaying these log messages will depend on the client
library you are using. For rust, you will need to configure a logging subscriber. For more details
ses the [log](https://docs.rs/log/latest/log/) docs. The Python and Java clients configure a default
logging subscriber that logs to stderr.

The Python/Java logger can be configured with several environment variables:

- `LANCE_LOG`: Controls log filtering based on log level and target. See the [env_logger](https://docs.rs/env_logger/latest/env_logger/) docs for more details. The `LANCE_LOG` environment variable replaces the `RUST_LOG` environment variable.
- `LANCE_TRACING`: Controls tracing filtering based on log level. Key tracing events described below are emitted at
  the `info` level. However, additional spans and events are available at the `debug` level which may be useful for
  debugging performance issues. The default tracing level is `info`.
- `LANCE_LOG_STYLE`: Controls whether colors are used in the log messages. Valid values are `auto`, `always`, `never`.
- `LANCE_LOG_TS_PRECISION`: The precision of the timestamp in the log messages. Valid values are `ns`, `us`, `ms`, `s`.
- `LANCE_LOG_FILE`: Redirects Rust log messages to the specified file path instead of stderr. When set, Lance will create the file and any necessary parent directories. If the file cannot be created (e.g., due to permission issues), Lance will fall back to logging to stderr.

## Trace Events

Lance uses tracing to log events. If you are running `pylance` then these events will be emitted
as log messages. For Rust connections you can use the `tracing` crate to capture these events.

Rust tracing targets are listed below. In `pylance` logs, trace events are emitted under a
`lance::events::` prefix so they can be filtered separately from normal log records. For example,
`LANCE_LOG="warn,lance::events::object_store::throttle=info"` shows storage throttling events
without enabling other Lance event logs.

### File Audit

File audit events are emitted when significant files are created or deleted.

| Event               | Parameter | Description                                                                |
| ------------------- | --------- | -------------------------------------------------------------------------- |
| `lance::file_audit` | `mode`    | The mode of I/O operation (create, delete, delete_unverified)              |
| `lance::file_audit` | `type`    | The type of file affected (manifest, data file, index file, deletion file) |

### Dataset Events

Dataset events are emitted when datasets are loaded, written, committed, deleted, compacted, or cleaned.

| Event                   | Parameter   | Description                                                               |
| ----------------------- | ----------- | ------------------------------------------------------------------------- |
| `lance::dataset_events` | `event`     | The dataset event type (loading, writing, committed, deleting, and others) |
| `lance::dataset_events` | `uri`       | The dataset URI                                                           |
| `lance::dataset_events` | `mode`      | The write mode                                                            |
| `lance::dataset_events` | `operation` | The committed transaction operation                                       |
| `lance::dataset_events` | `predicate` | The delete predicate                                                      |
| `lance::dataset_events` | `columns`   | The removed columns                                                       |

### Object Store Throttle Events

Object store throttle events are emitted when Lance observes cloud storage throttle responses and
reduces or retries request rates.

| Event                            | Parameter       | Description                              |
| -------------------------------- | --------------- | ---------------------------------------- |
| `lance::object_store::throttle`  | `previous_rate` | The request rate before AIMD adjustment  |
| `lance::object_store::throttle`  | `new_rate`      | The request rate after AIMD adjustment   |
| `lance::object_store::throttle`  | `attempt`       | The retry attempt for retry debug events |
| `lance::object_store::throttle`  | `error`         | The underlying object store throttle error      |

### I/O Events

I/O events are emitted when significant I/O operations are performed, particularly
those related to indices. These events are NOT emitted when the index is loaded from
the in-memory cache. Correct cache utilization is important for performance and these
events are intended to help you debug cache usage.

| Event              | Parameter | Description                                                                                          |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------- |
| `lance::io_events` | `type`    | The type of I/O operation (open_scalar_index, open_vector_index, load_vector_part, load_scalar_part) |

### Execution Events

Execution events are emitted when an execution plan is run. These events are useful for
debugging query performance.

| Event              | Parameter           | Description                                                    |
| ------------------ | ------------------- | -------------------------------------------------------------- |
| `lance::execution` | `type`              | The type of execution event (plan_run is the only type today)  |
| `lance::execution` | `output_rows`       | The number of rows in the output of the plan                   |
| `lance::execution` | `iops`              | The number of I/O operations performed by the plan             |
| `lance::execution` | `bytes_read`        | The number of bytes read by the plan                           |
| `lance::execution` | `indices_loaded`    | The number of indices loaded by the plan                       |
| `lance::execution` | `parts_loaded`      | The number of index partitions loaded by the plan              |
| `lance::execution` | `index_comparisons` | The number of comparisons performed inside the various indices |

### OpenTelemetry metrics

Beyond the trace events above, Lance can export metrics through the `metrics` crate facade
(Rust `metrics` feature). The `pylance` wheels are built with the `metrics` feature enabled:
install the OpenTelemetry extra (`pip install "pylance[otel]"`) and call
`instrument_lance_metrics`, which registers Lance's metrics as observable instruments on your
OpenTelemetry `MeterProvider` (`docs/guide/observability.md`, PR #7537).

## Threading Model

Lance is designed to be thread-safe and performant. Lance APIs can be called concurrently unless
explicitly stated otherwise. Users may create multiple tables and share tables between threads.
Operations may run in parallel on the same table, but some operations may lead to conflicts. For
details see [conflict resolution](../format/table/transaction.md/#conflict-resolution).

Most Lance operations will use multiple threads to perform work in parallel. There are two thread
pools in lance: the IO thread pool and the compute thread pool. The IO thread pool is used for
reading and writing data from disk. The compute thread pool is used for performing computations
on data. The number of threads in each pool can be configured by the user.

The IO thread pool is used for reading and writing data from disk. The number of threads in the IO
thread pool is determined by the object store that the operation is working with. Local object stores
will use 8 threads by default. Cloud object stores will use 64 threads by default. This is a fairly
conservative default and you may need 128 or 256 threads to saturate network bandwidth on some cloud
providers. The `LANCE_IO_THREADS` environment variable can be used to override the number of IO
threads. If you increase this variable you may also want to increase the `io_buffer_size`.

The compute thread pool is used for performing computations on data. The number of threads in the
compute thread pool is determined by the number of cores on the machine. The number of threads in
the compute thread pool can be overridden by setting the `LANCE_CPU_THREADS` environment variable.
This is commonly done when running multiple Lance processes on the same machine (e.g when working with
tools like Ray). Keep in mind that decoding data is a compute intensive operation, even if a workload
seems I/O bound (like scanning a table) it may still need quite a few compute threads to achieve peak
performance.

## Memory Requirements

Lance is designed to be memory efficient. Operations should stream data from disk and not require
loading the entire dataset into memory. However, there are a few components of Lance that can use
a lot of memory.

### Metadata Cache

Lance uses a metadata cache to speed up operations. This cache holds various pieces of metadata such
as file metadata, dataset manifests, etc. This cache is an LRU cache that is sized by bytes. The default
size is 1 GiB.

The metadata cache is not shared between tables by default. For best performance you should create a
single table and share it across your application. Alternatively, you can create a single session
and specify it when you open tables.

Keys are often a composite of multiple fields and all keys are scoped to the dataset URI. The following items are stored in the metadata cache:

| Item              | Key                                              | What is stored                      |
| ----------------- | ------------------------------------------------ | ----------------------------------- |
| Dataset Manifests | Dataset URI, version, and etag                   | The manifest for the dataset        |
| Transactions      | Dataset URI, version                             | The transaction for the dataset     |
| Deletion Files    | Dataset URI, fragment_id, version, id, file_type | The deletion vector for a frag      |
| Row Id Mask       | Dataset URI, version                             | The row id sequence for the dataset |
| Row Id Index      | Dataset URI, version                             | The row id index for the dataset    |
| Row Id Sequence   | Dataset URI, fragment_id                         | The row id sequence for a fragment  |
| Index Metadata    | Dataset URI, version                             | The index metadata for the dataset  |
| Index Details¹    | Dataset URI, index uuid                          | The index details for an index      |
| File Global Meta  | Dataset URI, file path                           | The global metadata for a file      |
| File Column Meta  | Dataset URI, file path, column index             | The search cache for a column       |

Notes:

1. This is only stored for very old indexes which don't store their details in the manifest.

### Index Cache

Lance uses an index cache to speed up queries. This caches vector and scalar indices in memory. The
max size of this cache can be configured when creating a `LanceDataset` using the `index_cache_size_bytes`
parameter. This cache is an LRU cached that is sized by bytes. The default size is 6 GiB.
You can view the size of this cache by inspecting the result of `dataset.session().size_bytes()`.

The index cache is not shared between tables. For best performance you should create a single table and
share it across your application.

**Note**: `index_cache_size` (specified in entries) was deprecated since version 0.30.0. Use
`index_cache_size_bytes` (specified in bytes) for new code.

### Scanning Data

Searches (e.g. vector search, full text search) do not use a lot of memory to hold data because they don't
typically return a lot of data. However, scanning data can use a lot of memory. Scanning is a streaming
operation but we need enough memory to hold the data that we are scanning. The amount of memory needed is
largely determined by the `io_buffer_size` and the `batch_size` variables.

Each I/O thread should have enough memory to buffer an entire page of data. Pages today are typically between
8 and 32 MB. This means, as a rule of thumb, you should generally have about 32MB of memory per I/O thread.
The default `io_buffer_size` is 2GB which is enough to buffer 64 pages of data. If you increase the number
of I/O threads you should also increase the `io_buffer_size`.

Scans will also decode data (and run any filtering or compute) in parallel on CPU threads. The amount of data
decoded at any one time is determined by the `batch_size` and the size of your rows. Each CPU thread will
need enough memory to hold one batch. Once batches are delivered to your application, they are no longer tracked
by Lance and so if memory is a concern then you should also be careful not to accumulate memory in your own
application (e.g. by running `to_table` or otherwise collecting all batches in memory.)

The default `batch_size` is 8192 rows. When you are working with mostly scalar data you want to keep batches
around 1MB and so the amount of memory needed by the compute threads is fairly small. However, when working with
large data you may need to turn down the `batch_size` to keep memory usage under control. For example, when
working with 1024-dimensional vector embeddings (e.g. 32-bit floats) then 8192 rows would be 32MB of data. If you
spread that across 16 CPU threads then you would need 512MB of compute memory per scan. You might find working
with 1024 rows per batch is more appropriate.

In summary, scans could use up to `(2 * io_buffer_size) + (batch_size * num_compute_threads)` bytes of memory.
Keep in mind that `io_buffer_size` is a soft limit (e.g. we cannot read less than one page at a time right now)
and so it is not necessarily a bug if you see memory usage exceed this limit by a small margin.

### Cloud Store Throttling

Cloud object stores (S3, GCS, Azure) are automatically wrapped with an AIMD (Additive Increase / Multiplicative
Decrease) rate limiter. When the store returns throttle errors (HTTP 429/503), the request rate decreases
multiplicatively. During sustained success, the rate increases additively. This applies to all operations
(reads, writes, deletes, lists) and replaces the old `LANCE_PROCESS_IO_THREADS_LIMIT` process-wide cap.

Local and in-memory stores are **not** throttled.

The AIMD throttle can be tuned via storage options or environment variables. Storage options take precedence
over environment variables:

| Setting            | Storage Option Key              | Env Var                         | Default |
| ------------------ | ------------------------------- | ------------------------------- | ------- |
| Initial rate       | `lance_aimd_initial_rate`       | `LANCE_AIMD_INITIAL_RATE`       | 2000    |
| Min rate           | `lance_aimd_min_rate`           | `LANCE_AIMD_MIN_RATE`           | 1       |
| Max rate           | `lance_aimd_max_rate`           | `LANCE_AIMD_MAX_RATE`           | 5000    |
| Decrease factor    | `lance_aimd_decrease_factor`    | `LANCE_AIMD_DECREASE_FACTOR`    | 0.5     |
| Additive increment | `lance_aimd_additive_increment` | `LANCE_AIMD_ADDITIVE_INCREMENT` | 300     |
| Burst capacity     | `lance_aimd_burst_capacity`     | `LANCE_AIMD_BURST_CAPACITY`     | 100     |

These initial settings are balanced and should work for most
use cases. For example, S3 can typically get up to 5000
req/s and with these settings we should get there in about
10 seconds.

## Fragment Sizing

A Lance table is a collection of fragments tracked by a manifest. How you size those fragments
trades off two classes of work:

- **Manifest-level operations** scale with the *number* of fragments. Every dataset mutation
  (appends, metadata updates, schema changes, compactions, etc.) rewrites the manifest, so a
  larger fragment list makes every write slower. Reads pay a similar cost up front: opening a
  dataset, listing fragments, planning a scan, and resolving transaction conflicts at the
  dataset level all walk the manifest.
- **Fragment-level operations** scale with the *size* of a fragment. These include scans
  against a matching fragment, compaction, updates, deletes, and `merge_insert`. Conflict
  detection for these operations is also done at the fragment level.

Fewer, larger fragments make manifest-level operations cheap but make each fragment-level
operation heavier and increase the chance of conflicts when many writers target the same
fragment. More, smaller fragments do the reverse.

Practical guidance:

- The default of 1M rows per fragment works well up to ~1B rows. Past that, bumping toward
  ~100M rows per fragment is reasonable, though fragment-count limits are rarely the bottleneck
  in practice.
- Tens of thousands of fragments per table is generally fine.
- Keep individual fragments well under object-store object-size limits (S3 caps at 5 TB, and
  stores tend to misbehave well before that). 10 GB–100 GB per fragment is a reasonable upper
  range; 1 TB is a hard ceiling.
- If you run many concurrent updates, deletes, or `merge_insert` operations, err toward more
  fragments — conflict detection is per-fragment, so too few fragments leads to excess
  retries.

## Conflict Handling

Lance supports concurrent operations on the same table using optimistic concurrency control. When two
operations conflict, one of them must be retried. Retries are handled automatically but they repeat
work that has already been done, which can hurt throughput. Understanding and minimizing conflicts is
important for maintaining good performance in write-heavy workloads.

Common sources of conflicts include:

- Concurrent compaction and index building, since both need to modify the same indices
- Update operations that affect the same fragments, since both need to rewrite the same data files

For more details on which operations conflict with each other, see
[conflict resolution](../format/table/transaction.md#conflict-resolution).

### Fragment Reuse Index

Compaction is one of the most expensive write operations because it rewrites data files and, by
default, remaps all indices to reflect the new row addresses. When compaction and index building
run concurrently, they often conflict because both need to modify the same indices. This typically
causes the compaction to fail and retry, and repeated failures can cause table layout to degrade
over time.

The Fragment Reuse Index (FRI) solves this by allowing compaction to skip the index remap step.
Instead of immediately updating indices, compaction records a mapping from old fragment row
addresses to new ones. When indices are loaded into the cache, the FRI is applied to translate
the old row addresses to the current ones. This adds a small cost to index load time but does
not affect query performance once the index is cached.

This decoupling means compaction and index building no longer conflict, which is especially
valuable for tables that are continuously ingesting data while also maintaining indices.

To enable the FRI, set `defer_index_remap=True` when compacting:

```python
dataset.optimize.compact_files(defer_index_remap=True)
```

For details on the index format and usage patterns, see the
[Fragment Reuse Index specification](../format/index/system/frag_reuse.md).

## Indexes

Training and searching indexes can have unique requirements for compute and memory. This section provides some
guidance on what can be expected for different index types.

### BTree Index

The BTree index is a two-level structure that provides efficient range queries and sorted access.
It strikes a balance between an expensive memory structure containing all values and an expensive disk
structure that can't be efficiently searched.

Training a BTree index is done by sorting the column. This is done using an [external sort](https://en.wikipedia.org/wiki/External_sorting) to constrain the total memory usage to a reasonable amount. Updating a BTree index does not
require re-sorting the entire column. The new values are sorted and the existing values are merged into the new sorted
values in linear time.

#### Storage Requirements

The BTree index is essentially a sorted copy of a column. The storage requirements are therefore the same as the column
but an additional 4 bytes per value is required to store the row ID and there is a small lookup structure which
should be roughly 0.001% of the size of the column.

#### Memory Requirements

Training a BTree index requires some RAM but the current implementation spills to disk rather aggressively and so the
total memory usage is fairly low.

When searching a BTree index, the index is loaded into the index cache in pages. Each page contains 4096 values.

#### Performance

The sort stage is the most expensive step in training a BTree index. The time complexity is O(n log n) where n is the number of rows in the column. At very large scales this can be a bottleneck and a distributed sort may be necessary. Lance currently does
not have anything builtin for this but work is underway to add this functionality. Training an index in parts as the data grows
may be slightly more efficient than training the entire index at once if you have the flexibility to do so.

When the BTree index is fully loaded into the index cache, the search time scales linearly with the number of rows that match the
query. When the BTree index is not fully loaded into the index cache, the search time will be controlled by the number of pages
that need to be loaded from disk and the speed of storage. The parts_loaded metric in the execution metrics can tell you how many
pages were loaded from disk to satisfy a query.

### Bitmap Index

The Bitmap index is an inverted lookup table that stores a bitmap for each possible value in the column. These bitmaps are compressed and serialized as a [Roaring Bitmap](https://roaringbitmap.org/).

A bitmap index is currently trained by accumulating the column into a hash map from value to a vector of row ids. Each value
is then serialized into a bitmap and stored in a file.

### Storage Requirements

The size of a bitmap index is difficult to calculate precisely but will generally scale with the number of unique values in the
column since a unique bitmap is required for each value and a single bitmap with all rows will compress more efficiently than
many bitmaps with a small number of rows.

#### Memory Requirements

Since training a bitmap index requires collecting the values into a hash map you will need at least 8 bytes of memory per row.
In addition, if you have many unique values, then you will need additional memory for the keys of the hash map. Training large
bitmaps with many unique values at scale can be memory intensive.

When a bitmap index is searched, bitmaps are loaded into the session cache individually. The size of the bitmap will depend on
the number of rows that match the token.

### Performance

When the bitmap index is fully loaded into the index cache, the search time scales linearly with the number of values that the
query requires. This makes the bitmap very fast for equality queries or very small ranges. Queries against large ranges are
currently extremely slow and the btree index is much faster for large range queries.

When a bitmap index is not fully loaded into the index cache, the search time will be controlled by the number of bitmaps that
need to be loaded from disk and the speed of storage. The parts_loaded metric in the execution metrics can tell you how many
bitmaps were loaded from disk to satisfy a query.

### Vector Index

Vector indexes (IVF_PQ, IVF_HNSW_SQ, etc.) are built in multiple phases, each with different memory requirements.

#### IVF Training

The IVF (Inverted File) phase clusters vectors into partitions using KMeans. To train the KMeans model, a sample of the
dataset is loaded into memory. The size of this sample is determined by:

```
training_data = num_partitions * sample_rate * dimension * sizeof(data_type)
```

The default `sample_rate` is 256. For example, with 1024 partitions, 768-dimensional float32 vectors, and the default
sample rate:

```
1024 * 256 * 768 * 4 bytes = 768 MiB
```

In addition to the training data, each KMeans iteration allocates membership and distance vectors proportional to the
number of training vectors (8 bytes per vector). The centroids themselves require `num_partitions * dimension *
sizeof(data_type)` bytes. In practice, the training data dominates and these additional allocations are small in
comparison.

If the dataset has fewer rows than `num_partitions * sample_rate`, the entire dataset is used for training instead.

#### Quantizer Training

After IVF training, a quantizer (e.g. PQ, SQ) is trained to compress vectors. This phase may sample some of the
dataset, but the sample size is tied to properties of the quantizer and the vector dimension rather than the size of the
dataset. As a result, quantizer training typically requires very little RAM compared to the IVF phase.

#### Shuffling

The final phase scans the entire vector column, transforms each vector (assigning it to an IVF partition and quantizing
it), and writes the results into per-partition files on disk. This is a streaming operation — data is not accumulated in
memory.

The input scan uses a 2 GiB I/O readahead buffer by default (configurable via `LANCE_DEFAULT_IO_BUFFER_SIZE`) and reads
batches of 8,192 rows. Incoming batches are transformed in parallel, with `num_cpus - 2` batches in flight at a time
(configurable via `LANCE_CPU_THREADS`). Each batch is sorted by partition ID and the slices are written directly to the
corresponding partition file. The in-flight memory during this phase is roughly:

```
io_readahead_buffer + num_cpu_threads * batch_size * (raw_vector_size + transformed_vector_size)
```

Each partition has an open file writer with roughly 8 MiB of accumulation buffer. In practice there shouldn't be that
much data accumulated in a single partition anyways. Instead, the max accumulation will be roughly the final size of
the partitions which comes out to `num_rows * (num_sub_vectors + 8) bytes`. For example, 100M rows with a 1536-dimensional
vector will have 96 sub-vectors and so the max accumulation will be ~10GB. The additional 8 bytes per row is for the row ID.

#### Storage Requirements

The on-disk size of a vector index consists of the IVF centroids and the quantized vectors.

The centroids require:

```
num_partitions * dimension * sizeof(data_type)
```

This is typically small. For example, 10K partitions with 768-dimensional float32 vectors is only 30 MiB.

The quantized vectors make up the bulk of the index. Each row stores a quantized code plus an 8-byte row ID. The
exact size depends on the quantizer:

**PQ (Product Quantization):** Each sub-vector is quantized to a single byte, so each row requires
`num_sub_vectors + 8` bytes. For example, 100M rows with 96 sub-vectors:

```
100M * (96 + 8) = ~9.7 GiB
```

**SQ (Scalar Quantization):** Each dimension is independently quantized to a single byte, so each row requires
`dimension + 8` bytes. SQ preserves more information than PQ but requires more storage. For example, 100M rows with
768-dimensional vectors:

```
100M * (768 + 8) = ~72.3 GiB
```

**RQ (RaBitQ):** Vectors are currently quantized to 1-bit binary codes. Each row also stores per-row
scale and offset factors (4 bytes each) used for distance correction. Each row requires
`dimension / 8 + 16` bytes (8 bytes for the row ID plus 8 bytes for the factors). For example, 100M
rows with 768 dimensions and 1 bit per dimension:

```
100M * (768 / 8 + 16) = ~10.8 GiB
```

## From `docs/src/quickstart/full-text-search.md` - Performance Tips section

## Performance Tips

### Index Maintenance

When you append new rows after creating an `INVERTED` index, Lance still returns those rows in `full_text_query` results. It searches indexed fragments using the FTS index, scans unindexed fragments with flat search, and then merges the results.

To keep FTS latency low as new data arrives, periodically add unindexed fragments into the existing FTS index by calling `ds.optimize.optimize_indices()`:

```python
# Append new data
new_rows = pa.table(
    {
        "id": [4],
        "text": ["The next train leaves at noon"],
    }
)
ds.insert(new_rows)

# Incrementally update existing indices (including "text_idx")
ds.optimize.optimize_indices(index_names=["text_idx"])

# Optional: monitor index coverage
stats = ds.stats.index_stats("text_idx")
print(stats["num_unindexed_rows"], stats["num_indexed_rows"])
```

!!! info
If you used a custom index name, replace `"text_idx"` with your index name.
If you did not set `name=...` when creating the FTS index on column `"text"`, the default index name is `"text_idx"`.

If you changed tokenizer settings (such as `with_position`, `base_tokenizer`, stop words, or stemming), rebuild the index with `create_scalar_index(..., replace=True)` so the full dataset is indexed with the new configuration.

### Index Configuration Best Practices

- Enable `with_position` when you need phrase queries, because it stores word positions within documents. For simple term searches, disabling this option can save considerable storage space without impacting performance.

- Keep `lower_case=True` enabled for most applications to ensure case-insensitive search behavior. This provides a better user experience and matches common search expectations, though you can disable it if case sensitivity is important for your use case.

- Enable stemming (`stem=True`) when you want better recall by matching word variations (e.g., "running" matches "run"). Disable stemming if you need exact term matching or if your domain requires precise terminology.

- Consider enabling `remove_stop_words=True` for cleaner search results, especially in content-heavy applications. This removes common words like "the", "and", and "is" from the index, reducing noise and improving relevance. Keep stop words if they carry important meaning in your domain.

### Query Optimization

Using specific, targeted search terms often yields better performance than broad, generic queries. More specific terms reduce the number of potential matches and allow the index to work more efficiently. Consider analyzing your most common search patterns and optimizing your index configuration accordingly.

Combining full-text search with metadata filters can significantly reduce the search space and improve performance. Use structured data filters to narrow down results before applying text search, or vice versa. This approach is particularly effective for large datasets where you can eliminate many irrelevant documents early in the query process.

### Further Reading

For advanced usage instructions with different tokenizers and more technical details on the index training process, including information about the expected memory and disk usage, visit the [full-text index](../format/index/scalar/fts.md) specification.

## From `docs/src/guide/json.md` - Performance Considerations section

## Performance Considerations

1. **Choose the right function**: Use `json_get_*` functions for direct field access and type conversion; use `json_extract` for complex JSONPath queries.
2. **Index frequently queried paths**: Use a JSON scalar index on frequently filtered paths before creating computed columns for the same fields.
3. **Minimize deep nesting**: While Lance supports arbitrary nesting, flatter structures generally perform better.
4. **Understand type conversion**: The `json_get_*` functions use strict type conversion, which may fail if types don't match. Plan your schema accordingly.
5. **Array access**: When working with JSON arrays, you can access elements by index using numeric strings (e.g., "0", "1") with `json_get` functions.


## From `docs/src/format/table/transaction.md` - CreateIndex compatibility (why unindexed fragments are safe)

#### CreateIndex Compatibility

Indexes record which fragments are covered by the index and we don't require all fragments be covered. As a result, it
is typically ok for an index to be created concurrently with the addition of new fragments. These new fragments will simply
be unindexed.

Updates and deletes are also compatible with index creation. This is because it is ok for an index to refer to deleted rows.
Those results will be filtered out after the index search. If an update occurs then the old value will be filtered out and the
new value will be considered part of the unindexed set.

If two CreateIndex operations are committed concurrently then it is allowed. If the indexes have different names this is no
problem. If the indexes have the same name then the second operation will win and replace the first.

## Performance changes not in the guide (v10, source-derived)

These are upstream performance behaviors verified against the `v10.0.0-beta.7` source and
commit history. They are **not** in `docs/src/guide/performance.md` - upstream has not
documented them there - so treat this subsection as source-derived rather than official text.

**The cache backend changed, and it can silently refuse entries.** quick_cache is now the
default for both the index cache and the metadata cache, hard-wired in `Session::new` with no
env var or Cargo feature to opt out (PR #7953, #8013). quick_cache splits its weight budget
evenly across shards with no borrowing and **silently refuses entries heavier than a shard's
share**. Shards are `min(cpus / 2, capacity / 4 GiB)`, floor 1, so on a small-CPU or
small-capacity configuration a large index partition may never cache at all - with no error and
no log line, only a persistent miss. If a partition looks uncacheable, compute the per-shard
share before tuning anything else. Measured FTS gain at concurrency 128: 180.7 -> 1340.6 qps,
710 -> 96 ms, 47% -> 93% CPU.

Cache keys also became opaque 16-byte BLAKE3 digests (`CACHE_KEY_FORMAT = "blake3-128-v1"`,
PR #7878) with **no legacy fallback** - every warm or persisted cache cold-misses once after
the upgrade. Budget for one cold window when rolling v10 out; do not read it as a regression.

**FTS query concurrency.** `LANCE_FTS_SEARCH_CHUNK` (default 16, min 1) sets how many
partitions are searched per CPU-pool task; chunking stops query concurrency from flooding the
pool with one small task per partition. Measured 227 -> 428 qps at concurrency 16. `=1` restores
the old per-partition shape. This is one of the few store-adjacent knobs worth knowing exists -
the default is right in the common case.

**FTS row-id resolution moved after the global top-k merge** (PR #7897): at most `limit` lookups
per query instead of per-partition. 4.1 -> 107.7 qps (26x), 3.9 s -> 148 ms on a 100M-doc
benchmark. The tradeoff is memory: each partition's ROW_ID column is now a separate weighed
index-cache entry at ~8 bytes/doc per partition (~800 MB for a 100M-doc index), and it now
counts against `index_cache_size_bytes`. Size the index cache accordingly.

**Segment commit LISTs concurrently** (PR #7657) - measured ~8x faster against remote storage
(2837 ms -> 350 ms at 128 segments, 20 ms RTT). This is a pure win requiring no action, but it
changes the shape of index-commit latency, so re-baseline before comparing against pre-v10
numbers.

**Compaction can now skip row-address map construction** entirely when no remappable data index
exists - FRI-only and system-index-only datasets included (PR #7778). If compaction was
previously dominated by the `_rowid` scan and RoaringTreemap build on such a dataset, that cost
is gone.

## Performance changes not in the guide (v11, source-derived)

Same caveat as above: verified against the `v11.0.0-beta.2` source and commit history, absent
from `docs/src/guide/performance.md`.

**Large commits got much cheaper on the manifest side** (PR #7881). Transactions serialized
above 20 MiB are no longer inlined into the manifest and live only in their external
`_transactions/` file. Measured on a large workload: the full-commit manifest shrank from
1576 MiB to ~790 MiB (-50%). There is no configuration to set - it is automatic, and it matters
most on object storage, where manifest size is read on every dataset open.

**Two O(n) fixes on hot paths.** `build_manifest` no longer does `O(n*m)` fragment comparisons
for Update/Delete transactions (PR #8210), which shows up on datasets with many fragments; and
fixed-width decode buffers are now preallocated exactly via a new optional
`decoded_size_bytes` contract on the decompressor traits (PR #8091), cutting **index-cache entry
weight by up to 74%** on IVF_SQ configurations. The latter is a pure accounting improvement -
"This does not change the on-disk format" - but it means the same `index_cache_size_bytes` now
holds substantially more, so re-measure before shrinking the budget.

**FTS conjunctions are cheaper and cold search parallelizes.** Conjunction approximations are
now ordered by iterator cost (PR #8299: 1.50x fewer comparisons, 1.12x speedup, bit-for-bit
identical results and tie order), and doc lengths preload in parallel on the cold deferred
search path (PR #8119).

**The cache backend is no longer a hard-wired choice** (PR #7683), which softens the "no opt-out"
statement in the v10 subsection above. A process-wide registry accepts custom backends, and a
compact URI form (`moka://?capacity=1073741824`) selects one without code. Related: reported
cache sizes shrink after PR #8159, because shared `Arc`/Arrow allocations are no longer charged
once per entry - **recalibrate any alert thresholds keyed on `LanceCache::deep_size_of()`
rather than reading the drop as a regression.**

**Incremental compaction is now expressible** (PR #8116): `compact_files(max_source_fragments=N)`
bounds a run to N source fragments, "allowing compaction to proceed incrementally. Fragments are
processed oldest first." Also settable as the manifest config key
`lance.compaction.max_source_fragments`. This is the clean answer to "compaction takes too long
to ever finish in my maintenance window" - previously the only lever was letting it run to
completion.

**Multipart uploads no longer lose parts on retry** (PR #8174). The old path called
`put_part` again on failure, and native cloud stores allocate a fresh part number for that call,
so the retry skipped the failed part and completion failed with `Missing part`. Retries now
happen inside the HTTP connector. If you saw sporadic `Missing part` failures on large writes,
this is the fix; OpenDAL-backed stores were never affected and are unchanged.

---

# Part B: Field-verified remote-storage practices

Everything below comes from production benchmarks of a Lance-based application (2.2M-row
corpus) running against S3-compatible object storage - not from the official docs. Each
practice was measured with a before/after comparison and shipped. Nothing here is
speculative; if an approach was tried and did not clearly win, it is not listed.

## The governing rule: minimize remote calls, don't tune the store

A tool that must work against arbitrary buckets (AWS, Hetzner, R2, MinIO, ...) cannot
assume any particular provider's rate limits or bandwidth. Leave `LANCE_IO_THREADS`,
`LANCE_AIMD_*`, and request timeouts at their defaults and treat them as
last-resort escape hatches, not levers: a knob tuned for one bucket misbehaves on another,
and the same wall-clock win is almost always available by issuing fewer remote calls
instead. Explicit per-column compression metadata was also tried and yielded little
real-world benefit relative to the effort - reducing what you read beats shrinking it.

Every practice below is an instance of the same rule: fewer commits, fewer scans,
fewer round trips.

## Write path

- **Commit count, not row count, is the cost unit.** Each commit is roughly a 1-second
  object-store round trip and rewrites the manifest, which grows with fragment count, and
  every version is retained until cleanup. A full-corpus copy that issued one
  `merge_insert` per batch took 75.7 min / 354 commits; rewritten as a single-commit
  append path the same copy took 18.2 min / 1 commit. A bounded A/B on one delta measured
  3,890 ms (merge) vs 882 ms (append).
- **Use `Append` for append-shaped data; reserve `merge_insert` for genuine upserts.**
  Merge is commit-latency-bound on object storage; append is bandwidth-bound.
- **Never commit per item.** A benchmark that committed once per logical unit produced
  3.3 GB of store for 40k tiny rows in ~20 min (manifest churn); the same work batched at
  ~100 units per commit was 17 MB in 1.6 s.
- **Skip no-op merges.** A `merge_insert` where every row matches with
  `WhenMatched::DoNothing` still commits a new (empty) version. Pre-filter to genuinely
  new keys and skip the merge entirely when the set is empty.
- **Compute derived columns before the append.** Embedding-then-merge-back doubles
  commits and rewrites rows; embedding before the append lets the vector ride the row's
  birth commit for free.
- **Append retries are not idempotent.** Unlike `merge_insert` (which no-ops on re-read),
  a retried append after a lost commit ack duplicates rows, and Lance has no unique
  constraint - OCC does not conflict two writers inserting the same new key. Retry only
  on genuine commit-conflict errors, and verify with `COUNT(*)` vs `COUNT(DISTINCT pk)`,
  not just missing-row checks.
- **Match Lance's typed conflict errors before wrapping them.** `CommitConflict`,
  `RetryableCommitConflict`, and `TooMuchWriteContention` are distinct variants
  (`rust/lance-core/src/error.rs:176,193,202`). Erasing them into an opaque application error
  early - `anyhow`, a generic `Storage` variant - makes every exhausted retry indistinguishable
  from a storage outage, and the retry loop can no longer tell "rebase and try again" from
  "give up". Match at the Lance boundary, not after three layers of `?`.
- **`merge_insert` silently changes execution mode with the source schema shape.** When the
  source schema is a strict subset of the target's and unmatched rows are kept, the builder
  routes to `RewriteColumns` (a cheap column update) rather than rewriting whole fragments
  (`rust/lance/src/dataset/write/merge_insert.rs:2232-2260`). Passing a full-schema source for
  what is logically a two-column update therefore costs dramatically more, with no warning.
  Project the source down to the key plus the columns actually being updated.
- **Local-filesystem durability is delegated, not added.** Lance's `file://` store is
  `object_store::LocalFileSystem` (`rust/lance-io/src/object_store/providers/local.rs:26`,
  `object_store 0.13.2`); Lance issues no fsync of its own on the commit path. Whatever
  crash-durability guarantee you get on a local dataset is that crate's, so do not assume a
  returned commit means the manifest bytes survived a power loss. See the next subsection for
  what that costs you in practice.

## Local-filesystem crash safety and recovery

This is the sharpest edge in Part B, because the failure is **permanent and silent** and has no
analogue on object storage. Mechanism, verified at `v11.0.0-beta.2`:

- **Latest-version resolution is "highest number wins", with no fallback.** On a local store
  Lance scans `_versions/` and keeps the maximum
  (`rust/lance-table/src/io/commit.rs:693-694`, `current_manifest_local`, selected first for
  local at `:283-286`). A manifest that exists but is truncated or zero-length is a hard error -
  "Invalid format: file size is smaller than 16 bytes"
  (`rust/lance-table/src/io/manifest.rs:60-63`) or "Invalid format: magic number does not match"
  (`:68`) - propagated straight up by `Dataset::latest_manifest`
  (`rust/lance/src/dataset.rs:1180`). The only error the open path swallows is `NotFound`
  (`rust/lance/src/io/commit.rs:313`), and corruption is not `NotFound`. **There is no
  "fall back to version N-1" anywhere.** So an unclean stop that creates the manifest without
  flushing its bytes leaves a dataset that will not open, even though version N-1 is fully
  intact on disk.
- **Editing `latest_version_hint.json` back does nothing.** On a local store the hint file is
  never read at all - `current_manifest_path` branches on `object_store.is_local()` before the
  hint path is considered (`commit.rs:283-291`). It *is* written on local now (`:79`, gated by
  `version_hint_globally_enabled() && !list_is_lexically_ordered`, `:328`), but writes are
  best-effort and it "never affects correctness (readers verify the hinted version and probe
  upward from there)" (`:340-341`). Rewinding it is inert.
- **The repair is to move the poisoned manifest aside**, not to touch the hint: quarantine
  (never delete) the sub-16-byte `*.manifest` files under `_versions/`, and the next-highest
  intact version becomes latest again. Rename rather than remove, so a misdiagnosis is
  reversible.
- **Then validate with a scan, not with `count_rows`.** `count_rows(None)` sums
  `physical_rows - deletions` straight from fragment metadata and opens no data file when the
  manifest carries the counts (`rust/lance/src/dataset/fragment.rs:1375-1379`, summed at
  `rust/lance/src/dataset.rs:1664-1671`). A zeroed or truncated data file that a surviving
  manifest still references is completely invisible to it - the row count reports fine while
  the data is unreadable. Only a drained scan proves integrity.
- **Object storage is structurally immune to this.** S3-style PUTs are atomic, so a killed
  writer leaves *no object* rather than an empty one, and there is no half-written manifest to
  poison the version sequence. This is a local-store-only failure class.
- If you run Lance on a local filesystem on hardware that can lose power, the mitigation is an
  fsync-on-write `WrappingObjectStore` (file plus parent directory after every put,
  multipart-complete, copy, and rename) installed innermost in the store-wrapper chain and gated
  to local URLs only, plus a `_versions/` walk on open that rename-quarantines undersized
  manifests. The fsync layer's measured cost on a multi-GiB, few-hundred-thousand-row corpus
  sync was not detectable.

## Index maintenance

- **Batch index folds behind a row-count threshold; never fold on every write tick.**
  Folding FTS + vector indexes on each 5-minute sync cost 15-445 s of the sync; deferring
  folds until the unindexed tail reaches ~5,000 rows cut a 80-524 s sync to ~44 s. The
  deferred tail costs only ~50-350 ms extra per query (see next point).
- **An unindexed tail is a latency concern, not a correctness one - if `fast_search` is
  off.** Lance answers FTS and vector queries as a union of the index scan and a flat
  scan of unindexed fragments. `fast_search` skips that flat arm, silently dropping the
  newest rows from results. Only enable it when no unindexed tail exists, and keep a
  tail-recall regression test.
- **Gate `cleanup_old_versions` to every Nth commit.** Its cost is O(accumulated
  versions), not O(delta): it consumed 8.8 s (58%) of a 200-row incremental sync and gets
  slower as versions pile up. Gating it on `dataset.version_id() % N` cut cleanup walks
  by ~87% with no behavior change.
- **"Pending cleanup" bytes are the retention window, not bloat.** Versions younger than the
  retention window are pinned by design, so an optimize pass over a young store legitimately
  reclaims zero. Know your actual window before calling it a leak: Python's
  `cleanup_old_versions` defaults `older_than` to **14 days** when neither `older_than` nor
  `retain_versions` is given (`python/python/lance/dataset.py:3113`), while automatic cleanup
  uses whatever `lance.auto_cleanup.older_than` the dataset config carries - the docs example
  sets `"3600s"` (`docs/src/guide/read_and_write.md:585`), which is where a "one hour" default
  is easily misremembered from. Never benchmark space reclamation on a store younger than the
  window actually in force.
- **A second, independent floor: unverified files are held for 7 days.**
  `UNVERIFIED_THRESHOLD_DAYS = 7` (`rust/lance/src/dataset/cleanup.rs:319`) is hardcoded. With
  the default `delete_unverified=false`, any file not reachable from a manifest but newer than
  7 days is treated as possibly-in-progress and refused for deletion **regardless of
  `older_than`**. Shortening the retention window does not touch this floor, so a store can sit
  well above its expected size for a week after heavy rewriting and still be behaving
  correctly.
- **A `replace=true` index rebuild roughly doubles store size until a later cleanup.**
  `create_index(replace=True)` writes the new index set and leaves the entire superseded set on
  disk as pending-cleanup - a measured rebuild roughly doubled both store size and object count
  until the next cleanup pass. Provision headroom for a full extra index set before rebuilding,
  and do not schedule a rebuild and a tight retention window against each other.
- **Measure maintenance on the real remote store.** A full FTS consolidation rebuild
  measured ~1 min locally but 4.5-5 min (rewriting ~190 MB) against the remote store -
  round trips dominate. If a periodic rebuild can exceed your scheduler interval, rely on
  Lance OCC (conflicting commit -> retry) and keep rebuild cadence low rather than trying
  to serialize externally.
- **`optimize_indices(append())` never collapses anything - and nothing else will either.**
  `append()` sets `num_indices_to_merge: Some(0)` (`rust/lance-index/src/optimize.rs:79-80`) and
  the merge path short-circuits on zero (`rust/lance/src/index/append.rs:408`). **No automatic
  count- or size-based collapse threshold exists in the codebase**, so a pipeline that only ever
  calls `append()` accumulates delta segments without bound until something else breaks - and
  what breaks first depends on the index family, which makes the symptoms look unrelated. Note
  the *default* `OptimizeOptions` is better behaved than `append()`: with `num_indices_to_merge`
  unset it collapses the trailing segment on every call (`append.rs:400-403`), and
  `retrain: true` merges everything into one. Pick an explicit ladder - collapse at a modest
  segment count, full rebuild at a higher one - and treat those numbers as correctness floors
  rather than tuning preferences.
- **`LANCE_MEM_POOL_SIZE` is the hidden ceiling on large from-scratch scalar index builds, and
  the default is smaller than it looks.** BTree/JSON training scans run with `use_spilling: true`
  (`rust/lance/src/index/scalar.rs:166`, `rust/lance-index/src/scalar/btree.rs:1942`), which
  wraps a DataFusion `FairSpillPool` sized from that variable
  (`rust/lance-datafusion/src/exec.rs:364,378`). The default is
  `DEFAULT_LANCE_MEM_POOL_SIZE_PER_PARTITION = 150 MiB` (`exec.rs:309`) multiplied by
  `target_partition.unwrap_or(1)` (`exec.rs:314,324`) - **so with `target_partition` unset the
  pool is 150 MiB total, not 150 MiB per core.** A large sort that fragments into more spill
  files than its fair-share slice can merge fails with a DataFusion `Resources exhausted ...
  ExternalSorterMerge` error rather than spilling further. Raise `LANCE_MEM_POOL_SIZE` (or set
  `LANCE_BYPASS_SPILLING`, `exec.rs:349`, to disable the pool entirely) before concluding the
  index cannot be built.
- **Auto-cleanup is opt-in and interval-gated - but `skip_auto_cleanup` is Rust-only.** The
  per-commit hook returns immediately unless the dataset config carries
  `lance.auto_cleanup.interval` and the current version is a multiple of it
  (`rust/lance/src/dataset/cleanup.rs:1450-1455`), and `auto_cleanup` defaults to `None`
  (`rust/lance/src/dataset/write.rs:434`); the gate itself is an in-memory config read costing no
  I/O. When it *does* fire it is expensive exactly as documented - it "lists and reads every
  manifest in the dataset even when nothing is old enough to delete" (`write.rs:356-357`,
  listing at `cleanup.rs:680`) - so choose the interval against version-accumulation rate, not
  write rate. Rust callers can also set `skip_auto_cleanup: true` (`write.rs:367`, builder at
  `write/commit.rs:212`); **pylance does not expose it** (only `auto_cleanup_options` /
  `enable_auto_cleanup` / `disable_auto_cleanup`), so from Python the lever is the interval or
  disabling the feature.
- **Cleanup runs outside the OCC protocol, which is *why* the 7-day floor exists.** Cleanup
  writes no manifest - it is a list-and-delete pass (`.remove_stream(paths_to_delete)`,
  `cleanup.rs:752`) - and the module doc states the bind directly: "It is also difficult to
  distinguish between a data/tx/idx file which was leftover from an abandoned transaction and a
  data file which is part of an ongoing operation (both will look like unreferenced data files)"
  (`cleanup.rs:20-22`). Hence `maybe_in_progress` holds anything newer than the threshold
  (`:666-667`). The operational rule that follows: **never run cleanup with
  `delete_unverified=true` while writers are live** - that flag removes the only thing standing
  between a concurrent in-flight write and deletion of its data files.
- **Object Lock / WORM retention must be off on the bucket.** Cleanup issues real per-object
  deletes (`store.delete(&location)`, `rust/lance-io/src/object_store.rs:964`) covering
  unreferenced data files, old manifests, and transaction files; index builds also delete temp
  objects (`rust/lance/src/index/vector/ivf.rs:2489`, `ivf/io.rs:501,520`). WORM retention blocks
  those deletes outright, so maintenance fails and the store grows without bound. (Compaction
  itself issues no deletes - it only writes new fragments and lets cleanup reclaim the old ones -
  so the failure surfaces at cleanup time, not at compaction time.)
- **Turning off stable row IDs is not the whole story on remap cost.** The gate is now
  `!uses_stable_row_ids() && !options.defer_index_remap && has_address_style`
  (`rust/lance/src/dataset/optimize.rs:2060-2061`), and row-address capture is skipped entirely
  when nothing will consume it (`:1653-1657`). So a non-stable-row-id dataset with **no**
  address-style index pays no remap cost at all - the "every compaction rewrites every index
  entry" rule only bites when such an index actually exists.

## Read path and query shaping

- **Answer metadata questions from the manifest, never from a column scan.**
  `count_rows("col IS NOT NULL")` reads the entire column (Lance keeps no per-column null
  metadata to short-circuit it) - on a wide text column that was ~133 MB of reads per
  call. "Does this dataset have embeddings?" is answered by index presence in the
  manifest, not by `IsNotNull("vector")` (measured 6.8-44 s per call on S3). Cache counts
  that only change on ingest.
- **Scalar and JSON indexes accelerate `WHERE` pushdown only.** A `GROUP BY
  json_get_string(col, 'name')` or a join key extracted from JSON evaluates the
  expression per row with no predicate to push down - the whole fat column ships over the
  network. Materialize hot JSON fields as narrow native columns (indexed if selective):
  this took the flagship analytics queries from >30 s timeouts on S3 to 8.5-24 s, and
  35x/14x faster locally.
- **A fat column co-located with narrow rows defeats late materialization.** Even a
  selective predicate over the narrow columns pays the fat column's page I/O when the
  rows interleave on the same pages. Keep wide payload columns out of tables you scan
  analytically, or split the hot fields out.
- **Substring search over an unindexed column is a full scan** - a BTree cannot serve
  `LIKE '%needle%'`. The official substring answers are the NGRAM index (for
  `contains()`) and the FM-Index (v8+, exact-byte only, segmented, no BM25 ranking).
  Until one is built, narrow the scan with indexed/materialized predicates first. Two
  constraints decide which index is even possible: NGRAM requires a `Utf8`/`LargeUtf8` column
  and rejects `LargeBinary` outright, and NGRAM lowercases and ASCII-folds both sides while
  FM-Index matches raw bytes - so the two return different result sets for the same needle
  (`lance-reference.md` section 11.2). Do not benchmark one against the other without checking
  that they are answering the same question.
- **Tune a slow vector query before rebuilding the index.** `nprobes` (IVF partitions searched)
  and `refine_factor` (candidates re-ranked against full-precision vectors) are query-time
  parameters that trade latency for recall with no reindex
  (`docs/src/quickstart/vector-search.md:208-210`). Sweep those first; a rebuild with different
  build-time parameters is the expensive last resort. Related trap: `approx_mode="fast"` does
  not reliably mean ACORN ran - it is skipped when the prefilter mask passes all rows or leaves
  under 10%, so a null result from that flag may mean the path was never entered.
- **Scalar-index pushdown does not wait for scale.** The planner emits a `ScalarIndexQuery`
  whenever the index exists, with no row-count or selectivity heuristic anywhere in the
  expression module - the plan for four rows and for two thousand is identical. Useful in both
  directions: a small table does benefit from a scalar index, and an unwanted index scan will
  not "optimize itself away" on small data.
- **`Dataset::versions()` is O(history) remote reads, not a metadata lookup.** It lists
  manifests and then **reads every one** to recover its timestamp
  (`rust/lance/src/dataset.rs:2618-2635`, which carries an upstream
  `// TODO: this API should support pagination`). On a dataset with hundreds of versions over
  remote storage this is a fetch storm - it shows up in access logs as reads of historical
  manifest versions in descending order. Use `version()` / the current manifest for "what
  version am I on"; reserve `versions()` for genuine history browsing, and never put it on a
  hot path or a health check.
- **A bitmap index turns prefix `LIKE` into an error, not a scan fallback.** With a BITMAP
  index on the column, `col LIKE 'prefix%'` fails with "LIKE prefix queries are not supported
  for bitmap indexes" (`rust/lance-index/src/scalar/bitmap.rs:823`) rather than degrading to a
  flat scan. Index choice can therefore *remove* a query shape that worked before the index
  existed - if you need both set membership and prefix matching on one column, a bitmap index
  alone is the wrong choice.
- **A blob column in SQL is a `{position, size}` struct descriptor.** Any cast or text
  operation on it surfaces as an opaque planner error (`Unsupported CAST from Struct(...) to
  Utf8View`) with nothing pointing at blobs as the cause. Read blob payloads through the blob
  APIs (`read_blobs` / `read_blob_ranges` / `take_blobs`) or
  `scanner(blob_handling="all_binary")`, not through SQL projection.

## Version-specific behavior (verify on your exact pin)

Same API, different behavior across majors - each of these was discovered in production,
not in release notes:

- **Lance 7.x: `optimize_indices` with `append()` silently full-rebuilds scalar
  (BTree/bitmap) indexes** - the O(delta) delta-segment path only works on v8+. On 7.x
  every fold rescans the whole indexed column.
- **Lance 7.0.0: incremental inverted-index (FTS) merge is broken twice over** - a
  token-id out-of-bounds panic once 4 delta segments accumulate, and an
  empty-delta-segment codec mismatch (`VarintDelta` vs `Fixed32` defaults) that poisons
  every subsequent merge. Consolidate by full rebuild (`create_index` with
  `replace=true`) instead of merging, and guard folds so an all-null tail never creates
  an empty segment.
- **Lance 7.x: `defer_index_remap=true` (Fragment Reuse Index) panics when combined with
  stable row IDs.** They are alternative solutions to the same problem - pick one. (v9
  rejects the combination cleanly.)
- **Stable-row-id datasets: `COUNT(*)` cannot use count pushdown before v9** (fixed
  upstream in PR #7360) - every count is a full scan plus a WARN. Don't count on the hot
  path; silence the warning with a scoped log directive, not a blanket mute.
- **v8 -> v9 renamed the FM-Index proto message** (PR #7397), making existing FM indexes
  unreadable after a bump. Treat any Lance major bump as an index-lifecycle event:
  re-validate fold, merge, compaction, and count behavior end-to-end on the exact pinned
  version rather than trusting API presence.
- **A Lance major bump does not imply a redesign - or a small blast radius.** The major is
  bumped automatically by `ci/publish_beta.sh` on any `breaking-change`-labeled PR, so v9 -> v10
  is the *same dev line* renamed. Read the labeled PRs, not the version delta: v10's four are
  the blob null-selection change, the cache-key change, the compaction remapper signature, and
  the MemWAL rename.
- **v10 cold-misses every cache once.** Cache keys became opaque BLAKE3 digests with no legacy
  fallback (PR #7878), so the first run after upgrading re-populates warm and persisted caches
  from scratch. Expect one slow window; do not chase it as a regression.
- **v10 changed blob API return types to `Optional`** (PR #7903). Code that zipped blob results
  positionally against its inputs was already wrong whenever a null blob appeared (results were
  omitted, not `None`); after v10 it will not compile in Rust, and in Python it silently starts
  yielding `None` entries. Audit blob call sites as part of the bump.
- **v10 may reject a caller's "table not found" assumption.** The directory namespace no longer
  reports transient storage failures as `TableNotFound` (PR #7931) - a create-or-open path that
  treated that error as "absent" could previously overwrite a live table on a 503, and now sees
  `Throttling` / `ServiceUnavailable` / `Internal` instead.
- **crates.io carries finals only.** The newest published crate is `lance 9.0.1` (2026-08-06);
  every beta and rc exists as a git tag with no crate. Pinning a beta means a git dependency,
  which also means no crates.io yank signal if one turns out bad.
- **Do not assume the previous major ever shipped a final.** The auto-bump has now fired on two
  consecutive dev lines, and *neither* `v9.1.0` nor `v10.1.0` was ever released; `v10.0.0` never
  got a final either, stopping at `v10.0.0-rc.3` on `release/v10.0`. "Upgrade to the latest
  major" is not a valid plan without checking which majors actually have finals - as of
  `v11.0.0-beta.2` that is `v9.0.1` and below.
- **v11 changes fragment-id semantics** (PR #8206). Overwrite no longer restarts ids at 0, and
  any commit producing duplicate ids is now rejected. Two audit items on a bump: code that reads
  a fragment by a hardcoded id after an overwrite, and any dataset written by Lance 0.16 or
  earlier that may already contain duplicate ids - those still read but can no longer be
  committed to, so a long-lived store may become read-only at exactly the wrong moment.
- **v11 changes HNSW graphs** (PR #8188): `m < 4` is now rejected, the persisted level layout was
  corrected, and greedy descent stops before level 0. Recall and latency both move. Re-baseline
  vector benchmarks across this bump rather than comparing to pre-v11 numbers.
- **v11 shrinks reported cache sizes** (PR #8159) without shrinking the cache - shared
  `Arc`/Arrow allocations are no longer double-counted per entry. An alert keyed on
  `LanceCache::deep_size_of()` will look like a sudden drop in cache utilization.
- **`lance.json` columns and `compact_files` still take a logical/physical roundtrip.**
  `prepare_reader` in `optimize.rs` uses `scanner.try_into_stream()`
  (`rust/lance/src/dataset/optimize.rs:1376`), whose `DatasetRecordBatchStream` applies
  `to_logical_stream` - converting `lance.json` LargeBinary to `arrow.json` Utf8
  (`rust/lance/src/dataset/scanner.rs:6386`) - and the write side converts back with
  `to_physical_stream` (`rust/lance/src/dataset/write.rs:1292`). The identical asymmetry was
  fixed for `update.rs` (PR #6741, which now uses the raw physical stream at
  `write/update.rs:291`) but **never applied to `optimize.rs`**, and no test combines a JSON
  field with compaction. It is benign only because the JSONB roundtrip is idempotent when the
  stored bytes are genuinely JSONB. The durable rule: **never write plain UTF-8 JSON text into a
  column tagged `lance.json`** - encode JSONB, and let Lance own the representation.

## Benchmarking traps

Each of these produced a wrong conclusion that shipped or nearly shipped:

- **Copy-then-optimize measures `IndexCreate`, never the incremental fold.** To measure
  fold cost: build indexes first, append a small tail, then optimize. An
  always-compact profile also masks the fold signal with compaction noise.
- **A/B on the same warm cache state.** Index/rowmap caches are keyed by store URL; a
  freshly cloned store URL always cold-starts (tens of seconds) and looks exactly like a
  regression. Compare binaries against the same URL, and separate cold from warm runs.
- **Measure memory after the first vector query, at production scale.** The IVF index
  loads lazily on first vector query and stays resident: an FTS-only idle of ~564 MiB
  became ~1,365 MiB after one vector query on a 2.2M-row corpus. Cold or FTS-only numbers
  understate steady-state RSS by ~2x.
- **Benchmark write paths end-to-end including `optimize_indices`.** Freshly written
  fragments are unindexed; different write strategies leave different fragment counts,
  so the maintenance cost differs even when the write cost looks identical.
- **Attribute wins to the metric you actually gated.** Per-sync wall time is dominated by
  compaction and index-append variance (single index-appends spiked 40-70 s); a change
  that reduces cleanup walks by 87% may not move wall time at all. Use paired
  before/after rounds to separate store-latency noise from the change under test.
- **An in-process S3 mock cannot validate OCC.** Mock servers backed by a local filesystem
  typically implement conditional PUT as check-then-write, with a real race window between the
  existence check and the write, so two concurrent `PutMode::Create` calls can both succeed and
  the last one wins. Real S3, R2, GCS, and Azure do this atomically. A concurrency test that
  passes against such a mock proves nothing about commit safety - run OCC tests against a real
  conditional-put store, or against `s3+ddb://`.
- **`memory://` sharing is session-scoped, and the scoping is not what the URI suggests.**
  `MemoryStoreProvider::new_store` mints "a fresh in-memory object store for each call"
  (`rust/lance-io/src/object_store/providers/memory.rs:14,25`), but the registry caches by
  `(prefix, params)` with weak refs and the memory provider returns the **constant** prefix
  `"memory"` (`memory.rs:56`) - so within one `Session` *all* `memory://` URIs collapse to one
  cache key and two opens return the same store, whatever path you wrote in the URI. Across
  sessions they share nothing, because `Session::default()` builds a new `ObjectStoreRegistry`
  (`rust/lance/src/session.rs:326`), and `ObjectStore::memory()` bypasses the registry entirely
  (`rust/lance-io/src/object_store.rs:583-586`). Both halves are test-isolation traps: distinct
  `memory://` paths in one session are *not* isolated from each other, and the same
  `memory://` path in two sessions is *not* shared. Use **`shared-memory://`** when you actually
  want a cross-session in-memory store - that scheme exists precisely because "`memory://` mints
  a fresh `InMemory` per `new_store` call"
  (`rust/lance-io/src/object_store/providers/shared_memory.rs:42`).
