from fastapi import APIRouter, Depends, HTTPException, Query

from ...deps import Filters, get_db, page_params
from ...schemas import Envelope, PagedEnvelope, PageMeta, Summary, TimelinePoint, UsageDetail, UsageRow

router = APIRouter()

LIST_COLUMNS = (
    "id,event_time,session_id,project,cwd,client,model,provider,input_tokens,output_tokens,cache_read_tokens,"
    "cache_write_tokens,total_tokens,context_window,max_output_tokens,prompt_preview,response_preview"
)
SORTS = {"time": "event_time", "tokens": "total_tokens"}


@router.get("", response_model=PagedEnvelope[list[UsageRow]], summary="List requests")
def list_usage(
    f: Filters = Depends(),
    paging=Depends(page_params),
    sort: str = Query("time", pattern="^(time|tokens)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    conn=Depends(get_db),
):
    page, page_size = paging
    where, params = f.where()
    total = conn.execute(f"SELECT COUNT(*) FROM v_usage {where}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT {LIST_COLUMNS} FROM v_usage {where} ORDER BY {SORTS[sort]} {order.upper()}, id DESC LIMIT ? OFFSET ?",
        params + [page_size, (page - 1) * page_size],
    ).fetchall()
    return {"data": [dict(r) for r in rows], "meta": PageMeta(total=total, page=page, page_size=page_size)}


@router.get("/summary", response_model=Envelope[Summary], summary="Totals for the filtered range")
def summary(f: Filters = Depends(), conn=Depends(get_db)):
    where, params = f.where()
    row = dict(
        conn.execute(
            f"""SELECT COALESCE(SUM(total_tokens),0) AS total_tokens, COUNT(*) AS total_requests,
                   COUNT(DISTINCT project_id) AS total_projects, COUNT(DISTINCT session_ref) AS total_sessions,
                   COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens,
                   COALESCE(SUM(cache_read_tokens),0) AS cache_read_tokens,
                   COALESCE(SUM(cache_write_tokens),0) AS cache_write_tokens
            FROM v_usage {where}""",
            params,
        ).fetchone()
    )
    for col, key in (("model", "top_model"), ("client", "top_client")):
        extra = f"{where} {'AND' if where else 'WHERE'} {col} IS NOT NULL AND {col} != ''"
        top = conn.execute(
            f"SELECT {col} FROM v_usage {extra} GROUP BY {col} ORDER BY COUNT(*) DESC LIMIT 1", params
        ).fetchone()
        row[key] = top[0] if top else ""
    row["avg_tokens_per_request"] = round(row["total_tokens"] / max(row["total_requests"], 1), 1)
    return {"data": row}


@router.get("/timeline", response_model=Envelope[list[TimelinePoint]], summary="Daily totals (local days)")
def timeline(
    f: Filters = Depends(),
    days: int = Query(0, ge=0, le=3650, description="0 = full history, else the N most recent active days"),
    conn=Depends(get_db),
):
    where, params = f.where()
    day = f.local_day_expr()
    sql = f"""SELECT {day} AS day, SUM(total_tokens) AS tokens, SUM(input_tokens) AS input,
                     SUM(output_tokens) AS output, SUM(cache_read_tokens) AS cache_read,
                     SUM(cache_write_tokens) AS cache_write, COUNT(*) AS requests
              FROM v_usage {where} GROUP BY day ORDER BY day DESC"""
    rows = conn.execute(sql + (" LIMIT ?" if days else ""), params + ([days] if days else [])).fetchall()
    return {"data": [dict(r) for r in rows]}


@router.get("/project/{project}", response_model=PagedEnvelope[list[UsageRow]], summary="Requests for one project")
def usage_by_project(project: str, paging=Depends(page_params), conn=Depends(get_db)):
    page, page_size = paging
    total = conn.execute("SELECT COUNT(*) FROM v_usage WHERE project=?", (project,)).fetchone()[0]
    rows = conn.execute(
        f"SELECT {LIST_COLUMNS} FROM v_usage WHERE project=? ORDER BY event_time DESC LIMIT ? OFFSET ?",
        (project, page_size, (page - 1) * page_size),
    ).fetchall()
    return {"data": [dict(r) for r in rows], "meta": PageMeta(total=total, page=page, page_size=page_size)}


@router.get("/{usage_id}", response_model=Envelope[UsageDetail], summary="One request, with full text")
def usage_detail(usage_id: int, conn=Depends(get_db)):
    row = conn.execute(
        f"SELECT {LIST_COLUMNS},prompt_full,response_full,transcript_path,transcript_line FROM v_usage WHERE id=?",
        (usage_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"data": dict(row)}
