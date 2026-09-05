# Changelog

All notable changes to Pansophy Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Chat regression tests for streamed tokens, keyboard submission, retries, model downloads,
  research sources, and file extraction controls.

- Local streamed conversations backed by Ollama.
- Optional deep-thinking model downloads with progress and desktop notifications.
- DuckDuckGo Lite research search with local-model summaries and source links.
- Image and PDF text extraction through bundled native tools.
- Light and dark theme support synchronized with the desktop window.
- A Docker Compose stack for the browser app, Ollama, and default model setup.
- Frontend coverage thresholds and isolated native health-check testing.

### Changed

- Contribution and pull request checklists require focused commits with regression tests,
  matching changelog entries, coverage checks, and verified dependency-removal evidence.

- Coverage enforcement now includes every JavaScript and Svelte source file, including modules
  not imported by tests, while excluding test setup and specs.

- Frontend CI now enforces 60% minimum line, function, branch, and statement coverage.
- Removed unused React, Threlte, icon, and legacy Tailwind plugin dependencies.

### Security

- Automated high-severity npm and RustSec dependency audits in CI.
