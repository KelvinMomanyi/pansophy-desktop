## Change

Describe the behavior this PR changes and the problem it solves.

## Validation

List commands and results. For a bugfix, identify the regression test that proves the fix.
For a CI gate change, include a deliberate failure check and the passing result after restoration.

## Checklist

- [ ] Each commit addresses one module or concern with its implementation, tests, and changelog entry.
- [ ] Formatting sweeps and unrelated refactors are separate from behavior changes.
- [ ] Lint, JavaScript/Svelte typecheck, formatting, and coverage checks pass.
- [ ] All four coverage metrics meet the 60% minimum with untested source files included.
- [ ] Dependency changes include both manifest and lockfile, with unused-package findings verified.
- [ ] Native changes pass cargo fmt, cargo check, and cargo test, or this PR has no native changes.
