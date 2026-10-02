# Roadmap

Direction, not promises. Open an issue to discuss any of these, or to propose something else.

**Next**
- Publish the Python SDK to PyPI and the JS SDK to npm from the release workflow.
- Per-project budgets/alerts (token thresholds, delivered via webhook).
- Model/plan-aware cost estimates as an *optional*, clearly labelled export column (never in the core
  schema).
- Dashboard: server-side search on Requests; session timeline view.

**Later**
- Prometheus `/metrics` endpoint as an alternative to OTLP push.
- Team mode: aggregate several machines' exports into one read-only dashboard (opt-in, self-hosted).
- Import/export of the whole database for moving between machines.

**Non-goals**
- A hosted service, accounts, or any telemetry about the tool itself.
- Exposing the API on a network by default.
