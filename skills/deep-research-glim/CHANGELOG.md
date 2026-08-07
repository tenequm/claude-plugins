# Changelog

All notable changes to `deep-research-glim` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this skill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.7] - 2026-08-07

### Fixed

- Subagent spawning referred to "the Task tool"; renamed to "the Agent tool" to match the current tool name.
- Sample queries hardcoded the years 2025-2026 and 2026; replaced with a `[current year]` placeholder or dropped so the queries do not go stale.

## [0.2.6] - 2026-07-22

### Added

- skill-card.md release record following NVIDIA's skill-card format

## [0.2.5] - 2026-07-10

### Changed
- CHANGELOG preamble pinned to Keep a Changelog 2.0.0 (format unchanged; KaC 2.0.0 keeps existing changelogs valid).

## [0.2.4] - 2026-06-16

### Changed

- Re-published under the `deep-research-glim` slug. The 2026-06-08 `surf -> glim` rename never reached ClawHub (CI `release-prepare` aborted: skill files changed without a version bump), leaving the new slug unpublished and the old `deep-research-surf` slug orphaned on the registry. Bumped the version to trigger publication; `deep-research-surf` retired.

### Added

- Initial CHANGELOG; tracking established.
