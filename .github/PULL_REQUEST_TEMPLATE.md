## What does this PR do?

<!-- One or two sentences. Link the issue it closes, e.g. "Closes #123". -->

## Why?

<!-- The motivation -- what was broken, missing, or worth improving. -->

## How was this tested?

- [ ] `make check` passes (or the individual commands in CONTRIBUTING.md)
- [ ] New behavior has a test (Python: `tests/`, dashboard: `*.test.ts(x)`, CLI: `cli/test/`)
- [ ] Manually verified in the running app, if UI-facing (describe what you clicked through)

## Checklist

- [ ] Schema / collector / reconcile changes are in `telemetry/` and come with a migration in
      `telemetry/db.py` (never edit an existing migration)
- [ ] Public API changes: `python scripts/export_openapi.py` re-run, `docs/API.md` and both SDKs updated
- [ ] `CHANGELOG.md` has an entry under "Unreleased" for user-visible changes
- [ ] No unrelated changes bundled in
