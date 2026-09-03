# Contributing

Thanks for improving Pansophy Desktop. Keep changes small, testable, and easy to review.

## Branch workflow

1. Create a short-lived branch from the current default branch.
2. Make one behavior change per commit and add or update the tests that prove it.
3. Use conventional commit prefixes such as `feat:`, `fix:`, `test:`, `refactor:`, or
   `docs:`.
4. Open a pull request that explains the behavior, verification performed, and any known
   limitations.

Avoid mixing formatting sweeps or unrelated refactors with a feature. Prefer commits under about
200 changed lines when the change can be split without separating behavior from its tests.

## Local setup

```sh
npm ci
```

For the complete native application, install the stable Rust toolchain and the Tauri platform
prerequisites described in [README.md](README.md).

## Required checks

Run these commands before every pull request:

```sh
npm run lint
npm test
```

The frontend checks in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) also enforce
formatting, Svelte diagnostics, coverage thresholds, dependency auditing, and a production build.
Run their local equivalents when your change touches those areas:

```sh
npm run format:check
npm run check
npm test -- --coverage
npm audit --audit-level=high
npm run build
```

Native changes must also pass:

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## Tests

- Keep frontend tests beside their modules as `*.test.js`.
- Put Rust unit tests in the module's `tests` block and cross-module tests in `src-tauri/tests`.
- Mock network and sidecar boundaries; tests must not depend on a running Ollama or DuckDuckGo.
- Name tests after observable behavior and cover both successful and rejected inputs.

## Pull request checklist

- The change and its tests are in the same focused commit.
- Required local checks pass.
- User-facing behavior and configuration are documented.
- No secrets, generated coverage output, build artifacts, or platform-local files are included.
