from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterator
from typing import Any

JSON = dict[str, Any]


class ApiError(Exception):
    def __init__(self, status: int, message: str, path: str):
        super().__init__(f"{status} {message} ({path})")
        self.status = status
        self.message = message
        self.path = path


def _local_tz_offset() -> int:
    # Same convention as JavaScript's Date#getTimezoneOffset(): UTC = local + offset.
    return int(-(time.localtime().tm_gmtoff or 0) / 60)


class TokenTelemetry:
    """Thin, dependency-free client. Every method returns the ``data`` part
    of the API envelope (plain dicts/lists, see docs/API.md for fields).

    Date filters (``start``/``end``, YYYY-MM-DD, inclusive) and daily buckets
    use your local time zone unless ``tz_offset`` is passed explicitly."""

    def __init__(self, base_url: str = "http://127.0.0.1:8000", timeout: float = 30.0, tz_offset: int | None = None):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.tz_offset = _local_tz_offset() if tz_offset is None else tz_offset

    # -- transport --------------------------------------------------------
    def _request(self, method: str, path: str, params: JSON | None = None) -> Any:
        query = {k: v for k, v in (params or {}).items() if v is not None}
        query.setdefault("tz_offset", self.tz_offset)
        url = f"{self.base_url}{path}?{urllib.parse.urlencode(query)}"
        req = urllib.request.Request(url, method=method, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:  # noqa: S310 -- caller-chosen URL
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            try:
                body = json.loads(exc.read().decode("utf-8"))
                message = (body.get("error") or {}).get("message") or str(body.get("detail"))
            except (ValueError, AttributeError):
                message = exc.reason
            raise ApiError(exc.code, str(message), path) from None

    def _get(self, path: str, **params: Any) -> Any:
        return self._request("GET", path, params)["data"]

    def _paged(self, path: str, page_size: int, **params: Any) -> Iterator[JSON]:
        page = 1
        while True:
            body = self._request("GET", path, {**params, "page": page, "page_size": page_size})
            yield from body["data"]
            meta = body.get("meta") or {}
            if page * page_size >= meta.get("total", 0) or not body["data"]:
                return
            page += 1

    # -- endpoints --------------------------------------------------------
    def health(self) -> JSON:
        return self._request("GET", "/health")

    def summary(self, **filters: Any) -> JSON:
        """Totals. Filters: project, client, model, session_id, start, end."""
        return self._get("/api/v1/usage/summary", **filters)

    def timeline(self, days: int = 0, **filters: Any) -> list[JSON]:
        return self._get("/api/v1/usage/timeline", days=days, **filters)

    def usage(
        self, page: int = 1, page_size: int = 100, sort: str = "time", order: str = "desc", **filters: Any
    ) -> list[JSON]:
        return self._get("/api/v1/usage", page=page, page_size=page_size, sort=sort, order=order, **filters)

    def iter_usage(self, page_size: int = 500, **filters: Any) -> Iterator[JSON]:
        """Every request matching the filters, newest first, across pages."""
        return self._paged("/api/v1/usage", page_size, **filters)

    def request(self, usage_id: int) -> JSON:
        """One request including full prompt/response text."""
        return self._get(f"/api/v1/usage/{int(usage_id)}")

    def projects(self, **filters: Any) -> list[JSON]:
        return self._get("/api/v1/projects", **filters)

    def project(self, name: str) -> JSON:
        return self._get(f"/api/v1/projects/{urllib.parse.quote(name, safe='')}")

    def project_hotspots(self, name: str) -> list[JSON]:
        return self._get(f"/api/v1/projects/{urllib.parse.quote(name, safe='')}/hotspots")

    def project_paths(self, name: str, limit: int = 200) -> list[JSON]:
        return self._get(f"/api/v1/projects/{urllib.parse.quote(name, safe='')}/paths", limit=limit)

    def tools(self, **filters: Any) -> list[JSON]:
        return self._get("/api/v1/tools", **filters)

    def skills(self, **filters: Any) -> list[JSON]:
        return self._get("/api/v1/skills", **filters)

    def mcp_servers(self, **filters: Any) -> list[JSON]:
        return self._get("/api/v1/mcp", **filters)

    def clients(self, **filters: Any) -> list[JSON]:
        return self._get("/api/v1/clients", **filters)

    def iter_sessions(self, page_size: int = 500, **filters: Any) -> Iterator[JSON]:
        return self._paged("/api/v1/sessions", page_size, **filters)

    def session(self, session_id: str) -> JSON:
        return self._get(f"/api/v1/sessions/{urllib.parse.quote(session_id, safe='')}")

    def iter_events(self, page_size: int = 500, event_type: str | None = None, **filters: Any) -> Iterator[JSON]:
        return self._paged("/api/v1/events", page_size, event_type=event_type, **filters)

    def plugins(self) -> JSON:
        return self._get("/api/v1/plugins")

    def settings(self) -> JSON:
        return self._get("/api/v1/settings")

    def reconcile(self) -> JSON:
        """Ask the backend to re-scan transcripts now."""
        return self._request("POST", "/api/v1/settings/reconcile")["data"]

    def export(self, kind: str = "requests", fmt: str = "ndjson", **filters: Any) -> bytes:
        """Raw report bytes (csv | json | ndjson)."""
        query = {
            k: v
            for k, v in {"kind": kind, "format": fmt, "tz_offset": self.tz_offset, **filters}.items()
            if v is not None
        }
        url = f"{self.base_url}/api/v1/reports/export?{urllib.parse.urlencode(query)}"
        with urllib.request.urlopen(url, timeout=self.timeout) as resp:  # noqa: S310
            return resp.read()
