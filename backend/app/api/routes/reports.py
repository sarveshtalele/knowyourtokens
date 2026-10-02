import csv
import io
import json
from collections.abc import Iterator
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from telemetry.db import connect

from ...deps import Filters
from ...schemas import Envelope, ReportPreview

router = APIRouter()

REQUEST_COLUMNS = [
    "event_time",
    "project",
    "session_id",
    "client",
    "model",
    "provider",
    "input_tokens",
    "output_tokens",
    "cache_read_tokens",
    "cache_write_tokens",
    "total_tokens",
    "prompt_preview",
    "response_preview",
]
PROJECT_COLUMNS = [
    "project",
    "total_tokens",
    "requests",
    "sessions",
    "top_tool",
    "top_tool_calls",
    "first_active",
    "last_active",
]
_FORMULA_LEAD_CHARS = ("=", "+", "-", "@", "\t", "\r")


def _escape_formulas(row: dict) -> dict:
    """Prefix spreadsheet-formula-looking cells with a quote. Prompt text and
    project names come from transcripts, so a crafted prompt could otherwise
    become a formula/DDE injection when the CSV is opened."""
    return {k: ("'" + v if isinstance(v, str) and v.startswith(_FORMULA_LEAD_CHARS) else v) for k, v in row.items()}


def _iter_rows(kind: str, f: Filters, limit: int | None) -> Iterator[dict]:
    conn = connect(readonly=True)
    try:
        where, params = f.where()
        lim = " LIMIT ?" if limit else ""
        extra = [limit] if limit else []
        if kind == "projects":
            sql = f"""SELECT project, project_id, COALESCE(SUM(total_tokens),0) AS total_tokens, COUNT(*) AS requests,
                             COUNT(DISTINCT session_ref) AS sessions, MIN(event_time) AS first_active,
                             MAX(event_time) AS last_active
                      FROM v_usage {where} GROUP BY project_id ORDER BY total_tokens DESC{lim}"""
            for r in conn.execute(sql, params + extra).fetchall():
                d = dict(r)
                top = conn.execute(
                    "SELECT tool_name, COUNT(*) AS c FROM tool_calls WHERE project_id=? "
                    "GROUP BY tool_name ORDER BY c DESC, tool_name LIMIT 1",
                    (d.pop("project_id"),),
                ).fetchone()
                d["top_tool"], d["top_tool_calls"] = (top[0], top[1]) if top else ("", 0)
                yield d
        else:
            cur = conn.execute(
                f"SELECT {','.join(REQUEST_COLUMNS)} FROM v_usage {where} ORDER BY event_time DESC, id DESC{lim}",
                params + extra,
            )
            while True:
                batch = cur.fetchmany(500)
                if not batch:
                    break
                for r in batch:
                    yield dict(r)
    finally:
        conn.close()


@router.get("/preview", response_model=Envelope[ReportPreview], summary="Row count + first rows of a report")
def preview_report(kind: str = Query("requests", pattern="^(requests|projects)$"), f: Filters = Depends()):
    rows = _iter_rows(kind, f, None)
    sample, count = [], 0
    for row in rows:
        if count < 5:
            sample.append(row)
        count += 1
    return {
        "data": {
            "row_count": count,
            "columns": PROJECT_COLUMNS if kind == "projects" else REQUEST_COLUMNS,
            "sample": sample,
        }
    }


@router.get("/export", summary="Download a report as CSV or JSON (streamed, no row cap)")
def export_report(
    kind: str = Query("requests", pattern="^(requests|projects)$"),
    format: str = Query("csv", pattern="^(csv|json|ndjson)$"),
    limit: int | None = Query(None, ge=1, description="Optional maximum number of rows"),
    f: Filters = Depends(),
):
    columns = PROJECT_COLUMNS if kind == "projects" else REQUEST_COLUMNS
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    headers = {"Content-Disposition": f'attachment; filename="tokentelemetry-{kind}-{stamp}.{format}"'}
    rows = _iter_rows(kind, f, limit)

    if format == "json":

        def gen_json():
            yield "["
            for i, row in enumerate(rows):
                yield ("," if i else "") + "\n  " + json.dumps(row, ensure_ascii=False)
            yield "\n]\n"

        return StreamingResponse(gen_json(), media_type="application/json", headers=headers)

    if format == "ndjson":
        return StreamingResponse(
            (json.dumps(r, ensure_ascii=False) + "\n" for r in rows), media_type="application/x-ndjson", headers=headers
        )

    def gen_csv():
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(_escape_formulas(row))
            if buf.tell() > 64_000:
                yield buf.getvalue()
                buf.seek(0)
                buf.truncate()
        yield buf.getvalue()

    return StreamingResponse(gen_csv(), media_type="text/csv; charset=utf-8", headers=headers)
