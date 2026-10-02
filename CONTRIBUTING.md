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
make dev-daemon     # session-file poller (all agents), optional
make check          # everything CI runs: lint, format, tests, OpenAPI drift, build
```

There's also a [devcontainer](.devcontainer/devcontainer.json) that runs `make setup` for you.

To try the real installed experience from your checkout: `node cli/setup.js` (packs the CLI, installs
it globally, runs `install`).

## Where things live

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#repository-layout). The rules that matter most:

- **One implementation of schema, collector, sources and reconcile:** `telemetry/`. `backend/` imports it; never
  copy that logic.
- **Schema changes ship as a new migration** in `telemetry/db.py` (`MIGRATIONS[n]`, bump
  `SCHEMA_VERSION`) with a test in `tests/test_migration.py`. Never edit a released migration.
- **API changes** need Pydantic models in `backend/app/schemas.py`, then `make openapi`, and updates
  to `docs/API.md` and both SDKs (`sdk/python`, `sdk/js`). Within `/api/v1`, only *add* fields and
  endpoints.
- **Hooks must never fail a Claude Code session.** Anything in `telemetry/collector.py` catches and
  logs.
- **Sources only read.** A reader in `telemetry/sources/` must never write to an agent's files or
  database (OpenCode's is opened `mode=ro`), and one bad file must not stop the rest.
- **Don't claim support that isn't there.** A new agent source needs real sample files from that
  agent as test fixtures. If an agent doesn't store per-request token usage in a readable form,
  document the [ingest API](docs/INTEGRATIONS.md#track-any-agent) for it instead.
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
| Collector, reconcile, agent sources, migrations, API, exporters, Python SDK | `tests/`, `sdk/python/tests/` | `.venv/bin/python -m pytest --cov` (80% gate) |
| Dashboard | `frontend/src/**/*.test.ts(x)` | `cd frontend && npm test` |
| CLI | `cli/test/` | `cd cli && node --test test/*.test.js` |
| JS SDK | `sdk/js/test/` | `cd sdk/js && npm test` |

Every bug fix needs a regression test. CI also runs Python 3.10–3.13, macOS and Windows, and a full
`npm pack → install → start → doctor` end-to-end on all three OSes.

## Adding an agent source

1. Add a `Source` subclass in `telemetry/sources/<agent>.py` (see the docstring in
   [`telemetry/sources/__init__.py`](telemetry/sources/__init__.py) and
   [ARCHITECTURE.md → Sources](docs/ARCHITECTURE.md#sources)). Pick the kind (`lines`, `document`,
   `incremental`) that matches how the agent writes its files.
2. Map the agent's usage to input / output / cache read / cache write without double counting
   (watch for cumulative totals and input that already includes cached tokens).
3. Register it in `all_sources()` and give it a `name` for `TOKENTELEMETRY_SOURCES`.
4. Add tests to `tests/test_sources.py`, and update `docs/INSTALLATION.md`, `docs/ARCHITECTURE.md` and
   the README.

## Pull requests

1. Open an issue first for anything non-trivial (schema, API, new dependencies), so we can agree on the
   approach.
2. Keep PRs focused, and add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for
   user-visible changes.
3. Fill in the PR template. CI must be green.

Good first issues are labelled
[`good first issue`](https://github.com/sarveshtalele/tokentelemetry/labels/good%20first%20issue).

## Releasing (maintainers)

First time? Do the one-time setup in [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md) first.


Releases are automated by `.github/workflows/publish.yml`. Pick one:

- **One click (usual):** GitHub → **Actions → Release → Run workflow** → choose `patch`, `minor` or
  `major`. It bumps every version (`scripts/bump-version.mjs`), moves the CHANGELOG's Unreleased notes
  under the new version, commits to `main`, runs the tests, publishes the CLI and the JS SDK to npm with
  provenance, and creates the GitHub release.
- **Through a PR:** run `node scripts/bump-version.mjs patch` locally, open a PR, merge it. The version
  change on `main` triggers the same publish.
- **From a Mac by hand:** `bash scripts/release-macos.sh` (publishes from your own npm login).

Keep the CHANGELOG's Unreleased section up to date in each PR; that becomes the release notes.

## Reporting bugs / security issues

Bugs: use the issue template and include `tokentelemetry doctor` output. Don't paste prompt or response
content. **Security issues: never in public.** See [SECURITY.md](SECURITY.md).
