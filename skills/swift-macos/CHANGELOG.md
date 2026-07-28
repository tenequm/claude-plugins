# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this skill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-07-28

### Fixed

- Foundation Models quick start assigned `Response<Content>` to the bare content type and did not compile; now reads `.content`. Verified with the compiler against the macOS 26.5 SDK.
- `.timeLimit(.seconds(30))` in testing.md is `@available(*, unavailable)` ("Time limit must be specified in minutes"); switched to `.minutes(1)`.
- `FetchDescriptor.fetchBatchSize` does not exist and the snippet mutated a `let`; replaced with `enumerate(_:batchSize:)`.
- Quick Start `@Model final class Task` shadowed `Swift.Task` in a file that then uses `Task {}` and `TaskGroup`; renamed to `ProjectTask`, matching relationships-predicates.md.

### Changed

- Current shipping macOS is 26.6 (was 26.5); noted that Xcode 26.6 still bundles the macOS 26.5 SDK.
- `weak let` corrected from a Swift 6.4 beta feature to SE-0481, shipped in Swift 6.3; 6.4 feature list rewritten against swift-evolution data.
- Xcode 27 and macOS 27 pinned to beta 4 status.
- Swift Testing version gates corrected: issue severity and all image attachments (including `CGImage`) are Swift 6.3 / Xcode 26.4, not 6.2. ST-0021 is now Implemented (Swift 6.4).
- SPM guidance modernized: `.strictMemorySafety()` over the experimental spelling, Swift Build as a 6.3 preview and 6.4 default, swift-syntax 603.0.2, swiftly 6.3.3.
- Dropped `altool --upload-app` (notary service stopped accepting it in 2023) in favor of notarytool.
- Gatekeeper Control-click bypass replaced with the Open Anyway flow - the Control-click override was removed in macOS Sequoia and is still absent in Tahoe.
- Corrected the `Schema.Attribute.Option` list; there is no `.encrypt` option.

### Added

- Xcode 27 build-breakers: ld64 and `-ld_classic` removal, unique Clang module-name requirement, `ARCHS_STANDARD` dropping x86_64 at deployment target 27.0+, the SE-0508 source break, and the `DocumentReader`/`DocumentWriter` `@concurrent` isolation change alongside the new `ReadableDocument`/`WritableDocument` protocols.
- SwiftData: `#Unique` and `#Index` macros, model inheritance with `includeSubclasses`, `.ephemeral`, history tracking (`HistoryDescriptor`/`HistoryToken`/tombstones), custom `DataStore`, fetch shaping (`propertiesToFetch`, `relationshipKeyPathsForPrefetching`), relationship cardinality.
- Swift Testing: `confirmation` for callback- and delegate-driven code, `withKnownIssue`, the `swift test` CLI surface, and the trap where Command Line Tools alone silently run no tests.
- Concurrency: the `Synchronization` module (`Mutex`, `Atomic`) for realtime and C-callback contexts, the `nonisolated(nonsending)` spelling, isolated conformances (SE-0470), `swift package migrate --to-feature`, and the individual upcoming-feature flags.
- ScreenCaptureKit: `synchronizationClock`, `SCScreenshotConfiguration`, Presenter Overlay delegate callbacks, and the omitted `SCStreamConfiguration` properties.
- SwiftUI: `@Entry`, native `WebView`/`WebPage`, rich-text `TextEditor`, and the `UtilityWindow`/`SettingsLink`/`defaultLaunchBehavior` scene surface.
- Distribution: `get-task-allow` as the top notarization blocker, plug-in entitlement inheritance, the Enhanced Security capability, `-exportNotarizedApp`, installer packaging, and Homebrew cask as a second channel.
- SPM: package traits, `--build-system swiftbuild`, `.binaryTarget`/`.systemLibrary`, plugin permissions, and the unwritable-`$HOME`-cache build failure.
- Foundation Models: `@PromptBuilder`/`@InstructionsBuilder`, `DynamicGenerationSchema`, `ContextOptions`.
- Field-hardening notes: actor reentrancy across awaits, the interleaved-vs-planar downmix trap, stale TCC rows after a signing-identity change, mic taps dying on output-device switches, third-party Voice Processing reshaping your input, mic-activity latching, MenuBarExtra label-update crashes, and crash visibility for menu-bar-only apps.

Verified against: swift@6.3.3, xcode@26.6, macos@26.6

## [0.6.3] - 2026-07-22

### Added

- skill-card.md release record following NVIDIA's skill-card format

### Changed

- metadata.openclaw audited against the official ClawHub spec

## [0.6.2] - 2026-07-10

### Changed
- CHANGELOG preamble pinned to Keep a Changelog 2.0.0 (format unchanged; KaC 2.0.0 keeps existing changelogs valid).

## [0.6.1] - 2026-07-01
### Changed
- Moved the "Fall 2026 Releases (WWDC 2026)" section out of SKILL.md into `references/fall-2026-releases.md` (progressive disclosure), keeping SKILL.md under the 500-line policy limit. Content unchanged, expanded slightly with sources.

## [0.6.0] - 2026-07-01
### Changed
- Current toolchain updated to Swift 6.3.3 / Xcode 26.6 (macOS 26.5 Tahoe SDK); dropped the stale "Swift 6.2.4, Feb 2026 latest" framing.
- Liquid Glass section notes the `UIDesignRequiresCompatibility` opt-out is removed for apps built with Xcode 27.

### Added
- Forward-looking "Fall 2026 Releases (WWDC 2026, beta)" section: macOS 27 Golden Gate, Xcode 27, Swift 6.4, Foundation Models next-gen (image input, server models, Dynamic Profiles, pluggable models), Core AI, Spatial Preview.
- CoreAudio CFString Create-Rule trap (`takeRetainedValue`) in core-audio-tap.md.
- `SIGKILL (Code Signature Invalid)` dev-loop gotcha in distribution.md.
- CHANGELOG and upstream tracking established.

Verified against: swift@6.3.3, xcode@26.6
