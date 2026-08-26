# Development Environment

Setting up a fast edit-compile-test loop, and keeping it fast as the project grows. None of this is needed on day 1 - reach for it when builds start to feel slow.

## The fast inner loop

The commands, fastest to slowest:

- `cargo check` - type-checks without code generation. This is your inner loop; run it constantly.
- `cargo clippy` - `check` plus lints. Set your editor to run this on save.
- `cargo build` / `cargo run` - full code generation.
- `cargo test` - build plus run tests.

In your editor, point rust-analyzer's check command at clippy so you get lint feedback inline (in VS Code: `"rust-analyzer.check.command": "clippy"`). rust-analyzer itself does most type-checking as you type; `cargo check` is the fallback the editor runs to populate diagnostics.

## Build speed

Two things make Rust builds slow: compiling code, and linking it. Caching compilation is the bigger win and is the same on every platform; the linker story is the part that differs.

### Build caching: use kache

[kache](https://github.com/kunobi-ninja/kache) is a content-addressed `RUSTC_WRAPPER`. It gives you a persistent, global cache of compiled **dependencies** - shared across every project on the machine, surviving `cargo clean`, branch switches, and fresh worktrees or clones at a different path. Cache hits restore zero-copy (a reflink on APFS/btrfs/XFS-with-reflink, a hardlink otherwise), so artifact bytes are not duplicated on disk. An optional S3 remote shares artifacts across machines and CI.

```sh
# Install (mise, or brew on macOS)
mise use -g github:kunobi-ninja/kache@latest
brew install kunobi-ninja/kunobi/kache

kache init      # wires RUSTC_WRAPPER into ~/.cargo/config.toml, installs + starts the daemon
kache doctor    # verify
```

`kache init` is idempotent - re-run it any time to repair the setup. To wire it by hand instead, set `rustc-wrapper = "kache"` under `[build]` in `$CARGO_HOME/config.toml`.

Sharing artifacts across machines needs a remote, in `~/.config/kache/config.toml`:

```toml
[cache.remote]
type = "s3"
bucket = "my-build-cache"
endpoint = "https://s3.example.com"   # omit for AWS S3; required for Ceph/MinIO/R2
profile = "my-aws-profile"            # an AWS profile, not env vars - see the quirks below
```

**kache strips Cargo's incremental flags for the compiles it caches.** That is deliberate: artifact caching replaces that path (and it sidesteps APFS-related incremental corruption on macOS). It is no longer the whole story, though - `adaptive_incremental` now defaults to `true`, so after a crate misses repeatedly on source or dependency changes kache learns that it is churning and gives it an isolated incremental directory for a bounded run before probing the artifact cache again. You do not have to configure that, and you should not try to force incremental back on globally; `cache.incremental_crates` is the escape hatch if you already know which crate is the churner.

### kache quirks worth knowing before they cost you a day

| Quirk | Why it bites |
|---|---|
| `local_max_size` defaults to **50GiB** | A dependency tree with heavy native or data crates (100-300 MB artifacts each) blows past it, GC starts evicting, and reuse you expected stops landing. This looks exactly like "cross-path reuse is broken" - it is not. Raise the cap (`KACHE_MAX_SIZE`, or `cache.local_max_size`). GC fires above the cap and evicts down to 90%, so you get a 10% hysteresis band rather than constant thrash at the boundary. Since 0.12.0 eviction is **cost-aware** - it indexes each entry's `compile_time_ms` and weighs what an artifact costs to rebuild, not just how big it is - so the old "size-only LRU throws away your expensive artifacts first" failure mode is gone. |
| Count hit rate lies | Judge by **cost-weighted** hit rate (`kache stats`, `kache report`). Cheap leaf crates hitting while the expensive spine misses every time still reads as a healthy-looking 60% by count. |
| `cache_executables` is on by default on Linux and macOS | Only Windows still defaults it to `false` (its `.pdb` path keeps debug info outside the binary). If you read older advice telling you to turn this on, it is already on. dylib/cdylib/proc-macro are always cached and unaffected by the flag either way. |
| `kache sync --push` filters to **workspace members** | Seeding an existing store to S3 from your project directory silently uploads almost nothing - the push filter is `cargo metadata --no-deps`. Run it from a directory with **no** `Cargo.toml` to push everything. Push also does a full unfiltered LIST of the prefix, which is a real cost on a large bucket. Since 0.15.0 `kache sync` exits non-zero if any transfer fails; pass `--allow-partial` when best-effort really is what you want. |
| An auto-started daemon does **not** inherit your shell environment | `KACHE_S3_*` credentials exported from your shell profile leave the launchd/systemd daemon with no credentials at all. Put the remote in the watched `[cache.remote]` config block, use an AWS profile (`cache.remote.profile`) or `~/.aws/credentials`, or start the daemon yourself from the intended environment with `kache daemon run`. |
| Set `endpoint` for any non-AWS object store | Ceph, MinIO, and R2 all need `cache.remote.endpoint` (or `KACHE_S3_ENDPOINT`) set explicitly; omit it only for AWS S3. kache always addresses path-style, so you do not need bucket-subdomain DNS to work. |
| Upgrading kache can orphan the service | The launchd plist or systemd unit keeps pointing at the deleted old binary. Re-run `kache init` (or `kache daemon install`) after an upgrade. |
| Keys encode **toolchain identity**, not machine identity | The key hashes the `rustc --version --verbose` banner (commit hash plus host triple), plus the linker's `--version` for outputs that actually link. Machines can share one bucket prefix safely - objects cannot collide - but only *matching toolchains* ever hit each other. Think **prefix per toolchain**, not per machine. Absolute build and checkout paths are deliberately normalized out, which is what makes a different clone path still hit. |
| `key_salt` covers what the key cannot see | A glibc, linker, or Nix-store change alters compiled output while leaving every version banner unchanged, so the key does not move and a stale artifact can be restored. With `cache_executables = true` a `nix store gc` can restore a binary pointing at a garbage-collected ELF interpreter - an error no `cargo clean` fixes. Set `cache.key_salt` to something that changes with your toolchain (a closure hash, a store-path digest). |
| Macro-read files are invisible to the key | sqlx's `query!` reads `.sqlx/*.json`, migration macros read `migrations/` - rustc never reports them, so editing one does not re-key the crate and you get a **stale hit**. Declare them in a per-crate `kache.toml` (`extra_inputs = [".sqlx/**/*.json", "migrations/**/*.sql"]`), or workspace-wide with a `[[workspace.extra_inputs]]` block. Note this is `kache.toml`, distinct from the project config `.kache.toml`. (Environment variables a proc macro reads during expansion *are* keyed as of 0.13.0, so that adjacent stale-hit class is closed.) |
| Do not bind-mount the cache directory into a container | kache's SQLite index needs single-machine file locking. Shared across an OS boundary it cannot open, and kache silently builds **uncached** (the build still succeeds). Give the container its own `KACHE_CACHE_DIR`. The same applies to NFS/SMB. |

Diagnosing a cache that is not paying off: `kache stats` for the weighted hit rate, `kache list --sort size` (large entries showing `hits: 0` mean eviction thrash, not a keying problem), `kache why-miss <crate>` for a specific crate, and `KACHE_LOG=warn cargo build` to run the path-leak detector, which flags any key field retaining a machine-local absolute path. For the full picture of what went into a key, `KACHE_LOG=trace` prints every component hashed - prefer that over any hand-kept list, which drifts as the keying logic evolves.

**Any `RUSTC_WRAPPER` puts your build cache in the failure path.** Once a wrapper is wired in, a broken, misconfigured, or sandboxed cache surfaces as a *compile failure* - and it will not look like a cache problem, it will look like a baffling Rust error. Before you spend an hour on a compile error that makes no sense, take the wrapper out of the picture and confirm the failure is real: `KACHE_DISABLED=1 cargo build` (kache's own bypass - note it still strips incremental flags unless you also set `KACHE_PRESERVE_INCREMENTAL=1`), or `RUSTC_WRAPPER= cargo build` for any wrapper. This applies equally to sccache.

Upgrading kache does **not** require wiping the cache. Keys only shift where the keying logic itself changed, so expect a one-time partial recompile and then a warm cache again - 0.15.0's move to cache-key schema v27 is exactly that: older entries cold-miss once and are then reclaimed automatically.

### sccache: the conservative alternative

[sccache](https://github.com/mozilla/sccache) is the older, more widely deployed compilation cache, and it is a reasonable choice if you want the most boring option:

```toml
# ~/.cargo/config.toml
[build]
rustc-wrapper = "sccache"
```

It caches dependencies but cannot cache linker-invoking crates - its docs are explicit that "Crates that invoke the system linker cannot be cached. This includes `bin`, `dylib`, `cdylib`, and `proc-macro` crates." It also does not touch your incremental setting, but that is not the win it sounds like: "Incrementally compiled crates cannot be cached" either, which is why the CI recipe below sets `CARGO_INCREMENTAL=0` when using sccache. The trade-off against kache: sccache does not restore zero-copy, and it has no cross-machine story as direct as kache's S3 sync. The two can also be chained - set `KACHE_FALLBACK=sccache` and kache hands the compiles it declines to cache over to sccache.

### Linkers

Independent of which cache you use.

On **macOS**, do nothing. The fast third-party linkers are Linux-first: mold's own source says outright that "mold does not support macOS", and wild (now at `wild-linker/wild`, published as the `wild-linker` crate) still lists Mach-O under what it does not yet support. Apple's bundled linker is already fast.

On **Linux**, you have the win for free: since Rust 1.90, `x86_64-unknown-linux-gnu` uses the bundled `rust-lld` linker by default (around 7x faster incremental linking than GNU `ld`, no setup). `mold` is faster still if you want to go further, via `.cargo/config.toml`:

```toml
[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=mold"]
```

Profile before assuming linking is your bottleneck - often it is not.

### CI

A minimal, reproducible GitHub Actions gate is three commands behind one toolchain action:

```yaml
name: ci
on: [push, pull_request]
permissions:
  contents: read          # least-privilege GITHUB_TOKEN
jobs:
  check:
    strategy:
      fail-fast: false     # one OS failing still shows the other
      matrix:
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - run: cargo fmt --check
      - run: cargo clippy --locked -- -D warnings
      - run: cargo test --locked
```

`actions-rust-lang/setup-rust-toolchain` reads `rust-toolchain.toml` for the channel and components and bundles `Swatinem/rust-cache` - toolchain install and build cache in one step, no separate cache action. `--locked` fails CI if `Cargo.lock` is stale; `clippy -- -D warnings` turns every lint in your `[lints]` table into a CI failure.

Cargo 1.97 stabilized a native replacement for that last trick. `build.warnings` "controls how lint warnings from local packages are treated", and the release notes describe it as "useful for enforcing a warning-free build in CI, replacing `-Dwarnings`". Setting it in `.cargo/config.toml` (or via `CARGO_BUILD_WARNINGS`) applies to every cargo command rather than only the one you remembered to append flags to:

```toml
# .cargo/config.toml
[build]
warnings = "deny"
```

**Keep the toolchain current, not just pinned.** Cargo shipped fixes for CVE-2026-5222 and CVE-2026-5223 in Rust 1.96.0, and 1.96.1 patched CVE-2025-15661, CVE-2026-55199 and CVE-2026-55200 in its vendored libssh2. A `rust-toolchain.toml` pin is for reproducibility, not for freezing - bump it deliberately and regularly.

**Think twice before adding `--all-features` to a lint or test job.** It is common advice, and it breaks the moment any optional feature needs a toolchain the runner does not have - a `cuda` feature that makes a build script shell out to `nvcc`, a feature pulling a GPU or FFI SDK. Those features exist precisely so that people who lack the toolchain can skip them, and `--all-features` removes that choice, making the job unbuildable on an ordinary machine. Lint the feature combinations you actually ship.

**Pick one cache, not two.** Stacking a compiler cache on top of the bundled `rust-cache` competes for the same Actions cache budget and usually makes things worse. When you outgrow `rust-cache` - typically once the dependency tree is big enough that restoring `target/` is itself slow, or you want runners and laptops to share compiled artifacts - swap it for [`kache-action`](https://github.com/kunobi-ninja/kache-action), which is a one-liner:

```yaml
- uses: kunobi-ninja/kache-action@v1
```

That uses the Actions cache by default; pass `s3-bucket` plus credentials to back it with S3, which is what makes reuse work across runners and across machines. Remember that cross-machine hits only land where the toolchain matches exactly, so a CI runner and a laptop on different host triples will never share artifacts no matter how the bucket is configured. If you use `sccache` in CI instead, set `CARGO_INCREMENTAL=0` so it can cache every compilation (kache handles this itself by disabling incremental).

## Dependency hygiene

Three cheap CI steps that catch things clippy never looks at. None of them need to be there on day 1; add them once the dependency tree is real.

- **`cargo audit`** checks `Cargo.lock` against the [RustSec advisory database](https://rustsec.org) - "Audit `Cargo.lock` files for crates with security vulnerabilities." This is the one to add first; it is a single command and it is the only thing in your pipeline that knows about published advisories.
- **`cargo deny check`** is the broader gate: licenses, banned crates, advisories, and allowed sources in one pass. **Its generated template does not work out of the box** - `cargo deny init` writes a `deny.toml` whose license allow-list is empty, which rejects every dependency and fails the check immediately. That is not a bug report waiting to happen, it is a file you are expected to fill in. Decide your license policy before wiring it into CI.
- **`cargo machete`** finds dependencies you declare and never use. It works by scanning for `use` statements, which is fast and deliberately imprecise - its own README calls the approach out. Expect false positives on dependencies that exist for a feature flag, a build script, or a re-export, and verify each hit against the source before deleting it. (`cargo-udeps` is more accurate and needs nightly; `cargo-shear` is a third option.)

## Finding out where build time actually goes

Before installing a cache, measure. `cargo build --timings` (stable since Cargo 1.60) writes an HTML report showing how long each crate took and how much of the build was actually parallel. It is free, it needs no setup, and it regularly shows that the problem is one pathological dependency or a serialized critical path rather than anything a cache would fix.

Two more commands worth knowing in the same breath: `cargo fix --edition` applies the mechanical changes for an edition migration, and `cargo clippy --fix` applies the lint suggestions that clippy marks as machine-applicable. Both operate on a clean git tree by default, which is exactly the safety you want.

## Optimizing dependencies in dev builds

Debug builds are slow at runtime because nothing is optimized. If a dependency does heavy computation (image processing, crypto, compression) and that dominates your dev-run time, optimize just the dependencies while keeping your own crates unoptimized for fast compiles:

```toml
[profile.dev.package."*"]
opt-level = 3
```

Your crates still compile fast; the dependencies, compiled once, then run fast.

To speed up your own crate's debug rebuilds, set `[profile.dev] debug = "line-tables-only"` - it keeps file and line numbers for panics and backtraces but drops the heavier per-variable debug info.

## File watchers

`bacon` runs `check`/`clippy`/`test` in a loop, re-running on save, with a compact summary view. Install with `cargo install --locked bacon` and run `bacon` in the project. Optional, but a nice background companion to the editor.
