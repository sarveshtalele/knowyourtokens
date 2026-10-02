"""Shared request dependencies: DB connections and common query filters."""

from collections.abc import Iterator
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, Query

from telemetry.db import connect

from . import bootstrap  # noqa: F401


def get_db() -> Iterator:
    """Read-only connection for one request, always closed afterwards."""
    conn = connect(readonly=True)
    try:
        yield conn
    finally:
        conn.close()


def _parse_day(value: str | None, name: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{name} must be YYYY-MM-DD") from None


def _utc_bound(day: date, tz_offset: int) -> str:
    # tz_offset follows JavaScript's Date#getTimezoneOffset(): minutes to ADD
    # to local time to get UTC (e.g. IST is -330).
    local_midnight = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    return (local_midnight + timedelta(minutes=tz_offset)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


class Filters:
    """Query filters shared by list, summary, timeline and report endpoints.

    ``start``/``end`` are inclusive local calendar days; they are converted to
    a half-open UTC range so the whole end day is included."""

    def __init__(
        self,
        project: str | None = Query(None, description="Project name ('All' = no filter)"),
        client: str | None = Query(None, description="Client name ('All' = no filter)"),
        model: str | None = Query(None),
        session_id: str | None = Query(None),
        start: str | None = Query(None, description="First day, YYYY-MM-DD (local)"),
        end: str | None = Query(None, description="Last day, YYYY-MM-DD (local, inclusive)"),
        tz_offset: int = Query(0, ge=-840, le=840, description="Browser getTimezoneOffset() in minutes"),
    ):
        self.project = None if project in (None, "", "All") else project
        self.client = None if client in (None, "", "All") else client
        self.model = model or None
        self.session_id = session_id or None
        self.start = _parse_day(start, "start")
        self.end = _parse_day(end, "end")
        if self.start and self.end and self.start > self.end:
            raise HTTPException(status_code=422, detail="start must be on or before end")
        self.tz_offset = tz_offset

    def where(
        self,
        time_col="event_time",
        project_col="project",
        client_col="client",
        model_col="model",
        session_col="session_id",
    ) -> tuple[str, list]:
        clauses, params = [], []
        for col, value in (
            (project_col, self.project),
            (client_col, self.client),
            (model_col, self.model),
            (session_col, self.session_id),
        ):
            if value is not None and col:
                clauses.append(f"{col} = ?")
                params.append(value)
        if self.start:
            clauses.append(f"{time_col} >= ?")
            params.append(_utc_bound(self.start, self.tz_offset))
        if self.end:
            clauses.append(f"{time_col} < ?")
            params.append(_utc_bound(self.end + timedelta(days=1), self.tz_offset))
        return ("WHERE " + " AND ".join(clauses)) if clauses else "", params

    def local_day_expr(self, time_col="event_time") -> str:
        minutes = -self.tz_offset
        return f"DATE({time_col}, '{minutes:+d} minutes')"


def page_params(page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=1000)):
    return page, page_size
