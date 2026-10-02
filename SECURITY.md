# Security Policy

## Supported versions

This project ships on a rolling basis from the `main` branch — there are no
maintained release branches. Security fixes land on `main` and are
documented in the commit history; there is no separate LTS or backport
policy at this stage.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a suspected security
vulnerability. Instead, use GitHub's private reporting flow:

1. Go to the [Security tab](https://github.com/sarveshtalele/tokentelemetry/security) of this repository.
2. Click **"Report a vulnerability"** to open a private advisory.

This keeps the report private between you and the maintainer until a fix
is ready, and gives GitHub's advisory database a structured record once it
is disclosed.

If the private-reporting button isn't available (it depends on a setting
the repository owner controls), open a regular issue that says only "I
have a security report" with no details, and details can be exchanged
through a private channel from there.

## What's in scope

This is a **local-first** tool: the backend binds to `127.0.0.1` only, the
data it collects never leaves the machine it runs on, and there is no
hosted service to attack. In-scope reports include:

- A way for a local exploit to escalate into reading files outside the
  intended install/data directories (e.g. a path-traversal bug).
- A way for the bundled dashboard (a browser page) to make the backend do
  something a same-origin request shouldn't be able to do (e.g. a CSRF or
  CORS misconfiguration issue).
- Command or SQL injection anywhere user-controlled, session-file-derived
  or ingest-API-supplied data reaches a shell command or a SQL query.
- A way for Token Telemetry to modify another agent's files or database
  (it should only ever read them).
- A dependency with a known, exploitable CVE that this project actually
  uses in a vulnerable way.

## What's explicitly out of scope

- "The backend has no authentication" — this is intentional for a
  local-first, single-user tool bound to `127.0.0.1`; it is not designed
  to be exposed on a network, and doing so is a deployment choice outside
  this project's threat model (see [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md)
  for the full reasoning).
- Vulnerabilities that require the attacker to already have local code
  execution as the same user running the tool (at that point they can
  already read the SQLite database directly, or push records to the
  local ingest API).

## Scope note

Token Telemetry is an independent project, not affiliated with Anthropic,
OpenAI, Google or any agent vendor. Vulnerabilities in the agents
themselves (Claude Code, Codex CLI, Gemini CLI, OpenCode, ...) should be
reported to their vendors.

## Full security review

A complete, point-in-time cybersecurity review of this codebase — attack
surface, dependency audit, and findings — is in
[docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md).
