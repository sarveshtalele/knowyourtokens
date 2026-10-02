from fastapi import APIRouter, Depends, Query

from ...deps import Filters, get_db, page_params
from ...schemas import EventRow, PagedEnvelope, PageMeta

router = APIRouter()


@router.get("", response_model=PagedEnvelope[list[EventRow]], summary="Raw hook events, newest first")
def list_events(
    f: Filters = Depends(),
    event_type: str | None = Query(None),
    paging=Depends(page_params),
    conn=Depends(get_db),
):
    page, page_size = paging
    where, params = f.where()
    if event_type:
        where = f"{where} {'AND' if where else 'WHERE'} event_type = ?"
        params.append(event_type)
    total = conn.execute(f"SELECT COUNT(*) FROM v_events {where}", params).fetchone()[0]
    rows = conn.execute(
        f"""SELECT id,event_time,event_type,session_id,project,client,model,tool_name,agent_type
            FROM v_events {where} ORDER BY id DESC LIMIT ? OFFSET ?""",
        params + [page_size, (page - 1) * page_size],
    ).fetchall()
    return {"data": [dict(r) for r in rows], "meta": PageMeta(total=total, page=page, page_size=page_size)}
