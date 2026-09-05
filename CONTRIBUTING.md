# Contributing

Thanks for improving Pansophy Desktop. Keep changes small, testable, and easy to review.

## Branch workflow

1. Create a short-lived branch from the current default branch.
2. Make one behavior change per commit and add or update the tests that prove it.
3. Update `CHANGELOG.md` in the same commit as the feature, fix, or configuration change it
   describes.
4. Use conventional commit prefixes such as `feat:`, `fix:`, `test:`, `refactor:`, or
   `docs:`.
5. Open a pull request that explains the behavior, verification performed, and any known
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
npm run check
npm test -- --coverage
```

The frontend checks in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) also enforce
formatting, JavaScript and Svelte typechecking, coverage thresholds, dependency auditing, and a
production build. Run the remaining checks before merging:

```sh
npm run format:check
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
- Run `npm test -- --coverage` after each frontend module change. The global minimum is 60%
  each for lines, functions, branches, and statements, including unimported application files.
- Keep the implementation, its regression tests, and its changelog entry together. Do not split
  the tests into a later bulk commit.

## Dependency changes

Run `npx depcheck` and search source files and configuration before removing a dependency.
Depcheck can miss Svelte imports, CSS imports, type packages, and plugins loaded by configuration.
For example, `@types/three` supplies scene types and `prettier-plugin-svelte` is loaded by
`.prettierrc.json`; neither needs a direct JavaScript import.

Keep `package.json` and `package-lock.json` changes in the same focused commit. Include the depcheck
findings and the evidence for confirmed removals in the commit message, then rerun the required
checks and `npm audit --audit-level=high`.

## Pull request checklist

- The change, its tests, and its `CHANGELOG.md` entry are in the same focused commit.
- Required local checks pass.
- User-facing behavior and configuration are documented.
- No secrets, generated coverage output, build artifacts, or platform-local files are included.
