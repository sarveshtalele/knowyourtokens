# Security review

A complete, point-in-time cybersecurity review of this codebase: the
threat model, what was checked, what was found, and what was fixed. This
is a living document — re-run the checks in
[Methodology](#methodology) after any change that touches the network
surface, file handling, or dependencies, and update this file.

For how to report a new vulnerability, see [`SECURITY.md`](../SECURITY.md)
at the repo root.

## Threat model

This is a **local-first, single-user** tool. Understanding what that does
and doesn't mean is the basis for everything below:

- The FastAPI backend binds to `127.0.0.1` only (`cli/src/run.js` and
  `backend/run.py` both pass `127.0.0.1`, never `0.0.0.0`). It is not designed to be reachable
  from another machine, and doing so is a deployment choice outside this
  project's threat model.
- The data collected (prompts, responses, tool calls, file paths) is
  exactly as sensitive as the agent sessions it comes from (Claude Code,
  Codex CLI, Gemini CLI, OpenCode, or records pushed to the ingest API). It never
  leaves the machine — there is no telemetry-of-the-telemetry, no
  third-party analytics, and no outbound network call unless the user
  configures an exporter (`TOKENTELEMETRY_OTLP_ENDPOINT` or
  `TOKENTELEMETRY_WEBHOOK_URL`). Since v2.0 the dashboard no longer loads
  Google Fonts either.
- The realistic attacker is **not** a remote adversary; it's either (a) a
  malicious web page open in the same browser as the dashboard (browser
  same-origin attacks: CSRF, XSS, an attacker-controlled export link), or
  (b) data that flows through the pipeline from the agents' own session
  files or from `POST /api/v1/ingest`, which are attacker-influenceable in
  principle (a prompt or
  a file a session touches can contain adversarial content) even though
  they're locally generated.
- Anyone with local code execution as the same OS user already has direct
  read access to the SQLite database and the agent session files it
  parses (and can push records to the ingest API) — that is out of scope by definition, the same way "an attacker
  with root" is out of scope for most local tools.

## Methodology

Manual, whole-repo review (not diff-based, since a security-review tool
scoped to a pending diff isn't useful once everything is already
committed) covering:

1. **Static analysis** — `ruff` (Python) and `tsc --noEmit` (TypeScript)
   across the full tree; grep sweeps for `shell=True`, `os.system`,
   `subprocess`, `eval(`, `exec(`, `pickle`, `yaml.load`,
   `dangerouslySetInnerHTML`, `new Function`, bare `except:`.
2. **Dependency audit** — `npm audit` for both `frontend/` and `cli/`;
   `pip-audit` against `requirements.txt` and `backend/requirements.txt`.
3. **Manual read-through** of every file-path-handling code path (the CLI
   installer, the static file server, reconcile's session-file parsing in
   `telemetry/sources/`) for
   path-traversal and injection risk.
4. **Manual read-through** of every SQL query for string-built (as
   opposed to parameterized) values.
5. **Secret scanning** — grep for common credential formats (AWS keys,
   GitHub tokens, npm tokens, PEM private keys, OpenAI-style `sk-` keys)
   across all tracked files and the full git history.
6. **CORS / origin policy** review of the FastAPI middleware config.
7. **Data-export review** — the CSV/JSON report export is a newer,
   user-triggered path from untrusted-ish data (transcript-derived text)
   to a file a person might open in a spreadsheet app, so it got the same
   scrutiny as user input normally would.

## Findings

| # | Finding | Severity | Status | Where |
|---|---|---|---|---|
| 1 | Path-traversal in the CLI's static file server: `filePath.startsWith(path.normalize(dir))` is a bare string-prefix check, which a sibling directory named `<installdir>-evil` would also satisfy | Medium | **Fixed** | `cli/src/static-server.js` |
| 2 | `react-router-dom` 6.28 carried two moderate CVEs: an open redirect via a backslash in `Link`/`useNavigate` (GHSA-wrjc-x8rr-h8h6), and arbitrary constructor injection in SSR hydration error deserialization (GHSA-337j-9hxr-rhxg) | Moderate | **Fixed** — upgraded to 7.18.3 | `frontend/package.json` |
| 3 | `vite` 5.4 (dev-server only) carried a path-traversal bug in optimized-deps `.map` handling and an `fs.deny` bypass on Windows (GHSA-4w7w-66w2-5vf9, GHSA-fx2h-pf6j-xcff) | Moderate/High, dev-only | **Fixed** — upgraded to 8.2.2 | `frontend/package.json` |
| 4 | CSV export (`/api/v1/reports/export?format=csv`) wrote prompt/response text directly into cells without checking for a leading `=`, `+`, `-`, or `@` — a crafted prompt containing something like `=cmd|'/c calc'!A1` would be interpreted as a live formula (or trigger a legacy DDE call) by Excel/Sheets when the exported file is opened. Classic CSV/formula injection | Medium | **Fixed** — cells starting with those characters are now prefixed with a leading `'` before being written | `backend/app/api/routes/reports.py` (`_escape_formulas`) |
| 5 | `.gitignore` didn't exclude common secret-bearing filenames (`.env*`, `.npmrc`, key/cert files) — nothing was ever committed, but the gap meant a future accidental commit wouldn't be caught | Low | **Fixed** | `.gitignore` |
| 6 | SQL queries built with an f-string in a few places (`usage.py`, `settings.py`, `telemetry/db.py`) | Reviewed | **No issue** — only hardcoded, developer-controlled fragments (column lists, `WHERE`/`LIMIT` clause *shape*) are interpolated; every actual value goes through a parameterized `?` placeholder. Confirmed by reading each call site. | — |
| 7 | CORS middleware allows `allow_methods=["*"]` and `allow_headers=["*"]` | Reviewed | **No issue** — `allow_origins` is an explicit whitelist of `localhost`/`127.0.0.1` dev ports (no wildcard), and `allow_credentials` is not set, so the wildcard methods/headers don't combine with credentialed wildcard origins (the actually dangerous combination) | `backend/app/main.py` |
| 8 | React frontend: any `dangerouslySetInnerHTML`, `eval`, or `new Function` usage that could turn transcript-derived text (tool names, file paths, prompts) into executed script | Reviewed | **No issue found** — none present anywhere in `frontend/src`; all dynamic text renders through JSX, which HTML-escapes by default | — |
| 9 | Command execution: any `shell=True`, `os.system`, or unsanitized `subprocess`/`child_process` call built from transcript- or request-derived strings | Reviewed | **No issue found** — every `subprocess`/`spawn` call in `backend/`, `telemetry/`, and `cli/` passes a fixed argv array (never a shell string built by concatenation); the one `shell: true` usage (`cli/setup.js`, Windows-only `commandExists`/`run` helpers) only ever runs fixed, hardcoded commands (`npm --version`, `npm pack`, `npm install -g <tmpdir tarball path>`) — none of the arguments come from transcript data or request input | `cli/setup.js` |
| 10 | Secrets in source or git history (API keys, tokens, credentials) | Reviewed | **No issue found** — grepped tracked files and full history for AWS/GitHub/npm/OpenAI-style key formats and PEM headers; none present. (An npm publish token used once during development was never written to a file or committed.) | — |
| 11 | Python dependency CVEs (`fastapi`, `uvicorn`, `pydantic`, `websockets`) | Reviewed | **No known vulnerabilities**: `pip-audit` now runs in CI on every push | `backend/requirements.txt` |
| 12 | `npm audit` on `frontend/` and `cli/` after the fixes above | Reviewed | **0 vulnerabilities** on `frontend/`; `cli/`'s own dependency surface is minimal (no lockfile — it deliberately has none of its own runtime deps beyond Node's stdlib) | — |
| 13 | **DNS rebinding**: no `Host` validation, so a malicious site could rebind its own hostname to 127.0.0.1 and read every stored prompt through the API or the dashboard's `/api` proxy | High | **Fixed (v2.0)**: Host allowlist in `backend/app/security.py` and `cli/src/static-server.js` | both |
| 14 | **Cross-site POST** to `/api/v1/settings/reconcile` (CSRF; also blocked the event loop) | Low | **Fixed (v2.0)**: Origin check on non-GET requests and WebSocket upgrades; reconcile runs in a worker thread, one at a time | `backend/app/security.py`, `settings.py` |
| 15 | Hook payloads stored whole, including `tool_response` (full file contents, command output) | Medium (privacy) | **Fixed (v2.0)**: bulky fields dropped, payload capped, likely secrets redacted before storage | `telemetry/common.py:slim_payload` |
| 16 | Database created with the default umask (often world-readable) | Low | **Fixed (v2.0)**: new DB `0600`, directory `0700`, migration backups `0600` | `telemetry/db.py` |
| 17 | `~/.claude/settings.json` rewritten non-atomically, no backup; malformed JSON crashed install half-way | Low (integrity) | **Fixed (v2.0)**: validated first, one-time backup, atomic rename | `cli/src/hooks.js`, `cli/src/fsutil.js` |
| 18 | `stop` trusted PIDs from `run.json`; PID reuse could terminate an unrelated process | Low | **Fixed (v2.0)**: command line must still match the service | `cli/src/process.js` |
| 19 | Dashboard served without CSP / `nosniff` / framing protection | Low | **Fixed (v2.0)**: strict CSP (no inline scripts), `X-Frame-Options: DENY`, `nosniff`, `no-referrer` | `cli/src/static-server.js` |
| 20 | Dev server (`backend/run.py`) bound `0.0.0.0` | Low | **Fixed (v2.0)**: binds `127.0.0.1` | `backend/run.py` |
| 21 | New write endpoint `POST /api/v1/ingest` (v2.1) accepts usage records from any local client | Design note | **Mitigated by design**: same Host allowlist and Origin check as the other `POST` endpoints (a web page can't post cross-site); body validated by Pydantic (`agent` 1–64 chars, at most 1000 records, non-negative integer token counts); runs through the same parameterized ingest as file sources | `backend/app/api/routes/ingest.py`, `backend/app/schemas.py`, `telemetry/ingest.py` |
| 22 | Reading other agents' local data (v2.1): Codex/Gemini CLI session files and OpenCode's SQLite database | Design note | **Mitigated by design**: files are only read, never written; OpenCode's database is opened `mode=ro`; a file that fails to parse is logged and skipped | `telemetry/sources/` |

## Residual risk and recommendations

These are things this review can't fix from inside the repository — they're
GitHub repository settings, which need the repo owner to change them in
the GitHub UI (Settings → Code security and analysis):

- **Enable secret scanning and push protection.** Catches a credential
  before it's pushed, not just after.
- **Enable Dependabot alerts.** This repo now ships
  `.github/dependabot.yml` (weekly dependency-update PRs for npm ×2 and
  pip), but *alerts* on already-known advisories are a separate toggle.
- **Enable private vulnerability reporting.** Makes the "Report a
  vulnerability" button in [`SECURITY.md`](../SECURITY.md) actually work.
- **Consider branch protection on `main`** (require the CI workflow to
  pass, require review) once there's more than one contributor —
  currently everything ships directly to `main` by design at this stage
  of the project.

Things that are **accepted risk**, not gaps, given the threat model above:

- No authentication on the backend API. Adding it would suggest a
  multi-user or networked deployment model this tool doesn't have; the
  actual control is binding to `127.0.0.1`.
- No rate limiting. There's no remote attacker to rate-limit against on a
  loopback-only service.
- No CSRF *token*. Origin checking (finding 14) covers browsers; a
  non-browser client on the same machine already has full local access.
- Any local process can push records to `POST /api/v1/ingest`, so pushed
  usage is only as trustworthy as the processes on the machine. Records
  appear under the `agent` name they were sent with.
- Exporters send data to user-configured URLs. That is the point of them,
  and they are off by default; webhook payloads exclude prompt text unless
  `TOKENTELEMETRY_WEBHOOK_INCLUDE_TEXT=1` and can be HMAC-verified.
