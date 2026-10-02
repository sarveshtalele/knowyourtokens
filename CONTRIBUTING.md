# Contributing to Token Telemetry

Thanks for helping! Issues, docs fixes, and PRs are all welcome. Please read the
[Code of Conduct](CODE_OF_CONDUCT.md) first. By contributing you agree your contribution is licensed
under the project's [MIT license](LICENSE).

## Quick start

Needs Python 3.10+, Node 18+ (22 recommended), and `make` (Windows: run the commands in the
`Makefile` directly, or use the devcontainer).

```bash
git clone https://github.com/sarveshtalele/tokentelemetry && cd tokentelemetry
make setup          # .venv + all Python/Node deps
make dev-backend    # API on :8000 (auto-reload)
make dev-frontend   # dashboard on :5173 (proxies /api and /ws)
make dev-daemon     # transcript poller, optional
make check          # everything CI runs: lint, format, tests, OpenAPI drift, build
```

There's also a [devcontainer](.devcontainer/devcontainer.json) that runs `make setup` for you.

To try the real installed experience from your checkout: `node cli/setup.js` (packs the CLI, installs
it globally, runs `install`).

## Where things live

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#repository-layout). The rules that matter most:

- **One implementation of schema, collector and reconcile:** `telemetry/`. `backend/` imports it; never
  copy that logic.
- **Schema changes ship as a new migration** in `telemetry/db.py` (`MIGRATIONS[n]`, bump
  `SCHEMA_VERSION`) with a test in `tests/test_migration.py`. Never edit a released migration.
- **API changes** need Pydantic models in `backend/app/schemas.py`, then `make openapi`, and updates
  to `docs/API.md` and both SDKs (`sdk/python`, `sdk/js`). Within `/api/v1`, only *add* fields and
  endpoints.
- **Hooks must never fail a Claude Code session.** Anything in `telemetry/collector.py` catches and
  logs.
- **Exact vs. estimated** must stay labelled in the UI, the API docs and the exports.
- **Local-first:** no new outbound network calls unless they're opt-in and documented.

## Style

- Python: `ruff check` + `ruff format` (config in `pyproject.toml`).
- Dashboard: `oxlint` + Prettier (`npm run lint`, `npm run format`).
- Comments explain *why* (a constraint, a workaround, an invariant), not *what*.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`,
  `chore:`, `ci:`; `!` for breaking), present tense, explaining the *why* in the body.

## Tests

| Area | Where | Run |
|---|---|---|
| Collector, reconcile, migrations, API, exporters, Python SDK | `tests/`, `sdk/python/tests/` | `.venv/bin/python -m pytest --cov` (80% gate) |
| Dashboard | `frontend/src/**/*.test.ts(x)` | `cd frontend && npm test` |
| CLI | `cli/test/` | `cd cli && node --test test/*.test.js` |
| JS SDK | `sdk/js/test/` | `cd sdk/js && npm test` |

Every bug fix needs a regression test. CI also runs Python 3.10–3.13, macOS and Windows, and a full
`npm pack → install → start → doctor` end-to-end on all three OSes.

## Pull requests

1. Open an issue first for anything non-trivial (schema, API, new dependencies), so we can agree on the
   approach.
2. Keep PRs focused, and add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for
   user-visible changes.
3. Fill in the PR template. CI must be green.

Good first issues are labelled
[`good first issue`](https://github.com/sarveshtalele/tokentelemetry/labels/good%20first%20issue).

## Releasing (maintainers)

1. Bump the version everywhere it appears: `telemetry/__init__.py`, `cli/package.json`,
   `sdk/js/package.json`, `sdk/python/pyproject.toml` +
   `sdk/python/src/tokentelemetry_client/__init__.py`, `frontend/package.json`, `site/package.json`.
2. Move the CHANGELOG's Unreleased entries under the new version.
3. Tag `vX.Y.Z` and publish a GitHub release. `.github/workflows/publish.yml` checks every version
   matches the tag, then publishes the CLI and the JS SDK to npm with provenance.

## Reporting bugs / security issues

Bugs: use the issue template and include `tokentelemetry doctor` output. Don't paste prompt or response
content. **Security issues: never in public.** See [SECURITY.md](SECURITY.md).
