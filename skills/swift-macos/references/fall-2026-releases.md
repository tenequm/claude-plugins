# Fall 2026 Releases (WWDC 2026)

Announced at WWDC 2026 (June 8, 2026), shipping fall 2026. Both Xcode 27 and macOS 27 are at **beta 4** as of 2026-07-28. Build against the shipping stack (Swift 6.3.3 / Xcode 26.6 / macOS 26.6 Tahoe) unless you specifically target these betas.

Sources: [Apple Newsroom, 2026-06-08](https://www.apple.com/newsroom/2026/06/apple-aids-app-development-with-new-intelligence-frameworks-and-advanced-tools/); [WWDC26 "What's new in Swift"](https://developer.apple.com/videos/play/wwdc2026/262); [Xcode 27 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes); [macOS 27 release notes](https://developer.apple.com/documentation/macos-release-notes/macos-27-release-notes).

## OS and toolchain

- **macOS 27 Golden Gate** (beta 4) - next macOS; Apple-silicon only. macOS 26.6 Tahoe is the current shipping release until fall.
- **Xcode 27** (beta 4, build 27A5228h, 2026-07-20) - agentic coding with Anthropic/Google/OpenAI models plus MCP plug-ins and the Agent Client Protocol; Apple-silicon only, ~30% smaller. Requires macOS Tahoe 26.4 or later. Gemini also landed in stable Xcode 26.6.
- **Swift 6.4** (beta; shipping toolchain is still 6.3.3) - `anyAppleOS` availability shorthand, targeted warning suppression (SE-0522), `~Sendable` to explicitly mark a type non-Sendable (SE-0518), Task Cancellation Shields (SE-0504), `Continuation` (SE-0528), `async` calls in `defer` bodies (SE-0493), borrow/mutate accessors (SE-0507), and a memberwise initializer that excludes private initialized properties (SE-0502).

Note: `weak let` (SE-0481) is **not** a 6.4 feature - it shipped in Swift 6.3 and is already available in the pinned toolchain.

## Xcode 27 build-breakers

These bite when you first open a project in Xcode 27, before any new API is adopted. Check them ahead of the beta.

- **The ld64 linker is gone.** "The ld64 linker has been removed and the `-ld_classic` option is no longer supported. (165165518)" Any project still carrying `-ld_classic` in `OTHER_LDFLAGS` - a flag Apple itself prescribed as a workaround in Xcode 15 - fails to link. Remove it.
- **Clang module names must be globally unique per dependency scan.** The optimized Swift dependency scanner now requires that "every Clang module reachable from a single Swift dependency-scan action must have a unique module name. If two module maps visible to the same scan declare a Clang module with the same name, the scan may report an error." The common cause is vendored third-party sources shipping a `module.modulemap` that redeclares an SDK module.
- **Universal binaries are no longer the default at deployment target 27.0+.** "The `ARCHS_STANDARD` build setting will no longer include x86_64 when `MACOSX_DEPLOYMENT_TARGET` or `DRIVERKIT_DEPLOYMENT_TARGET` >= 27.0." Add x86_64 to `ARCHS` explicitly if you still ship Intel. Xcode 27 itself installs only on Apple silicon.
- **SE-0508 source break.** "A computed property with both an `init` accessor and an array/dictionary literal initial value will no longer compile if the getter is declared before the `init` accessor." Workaround: declare the `init` accessor first.
- **libc++ floor raised.** The minimum supported C++ deployment target on macOS moves to 11.0, and `multimap`/`multiset::find` no longer necessarily returns an iterator to the first equal element.

## Document apps: concurrency and new protocols

macOS 27 adds `ReadableDocument` / `WritableDocument`, and new applications should prefer them over `ReferenceFileDocument` (which remains available). New `DocumentGroup` initializers adopting them expose an `Observable` `URLDocumentConfiguration`, let you disable document creation for editing-only apps, and present custom UI before any document is opened.

The isolation contract changed in a way that silently defeats off-main I/O if you carry old annotations forward:

> The `read(from:progress:)` and `write(content:to:previous:progress:)` requirements of `DocumentReader` and `DocumentWriter` are declared with `@concurrent` instead of `nonisolated`. With approachable-concurrency defaults that infer `MainActor` isolation, an unannotated `nonisolated` async method runs on the main actor, defeating the intent of off-main reading and writing. Conforming types that previously used `nonisolated` should switch to `@concurrent` to match.

`makeDocument:` and `makeReadableDocument:` closures passed to `DocumentGroup` initializers are now `@MainActor`-isolated.

## Frameworks

- **Foundation Models next-gen** - the single native Swift API now accepts image input and adds server models running on Private Cloud Compute. `DynamicProfile` swaps model/tools/instructions mid-session. A new `LanguageModel` protocol makes third-party models (Claude, Gemini) pluggable behind the same API. `LanguageModelSession.GenerationError` is deprecated as of 27.0 - it remains correct under the macOS 26.5 SDK you build against today, but expect a deprecation warning once you move to Xcode 27.
- **Core AI** - a brand-new framework, distinct from Foundation Models, for loading and running full-scale LLMs on device, optimized for the Neural Engine and unified memory.
- **SwiftUI** - reorderable list/grid containers, faster layout, and lazier `@State` initialization (back-deployed). In apps built with the macOS 27 SDK, `List` accepts drops in two cases that previously did not work: drags with compatible transfer representations into reorderable content even without `.reorderableItem`, and `.dropDestination(...)` declared on a list item. SwiftUI also now hides menu item symbol images in most contexts by default - use `.labelStyle(.titleAndIcon)` to opt a menu item back in. New **Spatial Preview** framework streams 3D content from a Mac to Apple Vision Pro.
- **Previews** - code inside `#Preview` now explicitly runs on the main actor, so it can call main-actor-isolated APIs without concurrency warnings or runtime check failures.

## Liquid Glass becomes mandatory

Apps rebuilt with the Xcode 27 SDK can no longer opt out of Liquid Glass - the `UIDesignRequiresCompatibility` key is ignored. Under Xcode 26 the key still works as a temporary migration aid. A new system transparency slider lets users tune the effect.
