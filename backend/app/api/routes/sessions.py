from fastapi import APIRouter, Depends, HTTPException

from ...deps import Filters, get_db, page_params
from ...schemas import Envelope, PagedEnvelope, PageMeta, SessionDetail, SessionRow

router = APIRouter()


@router.get("", response_model=PagedEnvelope[list[SessionRow]], summary="Sessions, most recent first")
def list_sessions(f: Filters = Depends(), paging=Depends(page_params), conn=Depends(get_db)):
    page, page_size = paging
    where, params = f.where()
    base = f"""SELECT u.session_ref, u.session_id, MAX(u.project) AS project, MAX(u.client) AS client,
                      COALESCE(SUM(u.total_tokens),0) AS total_tokens, COUNT(*) AS interactions,
                      MIN(u.event_time) AS started_at, MAX(u.event_time) AS last_active
               FROM v_usage u {where} GROUP BY u.session_ref"""
    total = conn.execute(f"SELECT COUNT(*) FROM ({base})", params).fetchone()[0]
    rows = conn.execute(
        f"""SELECT b.*, (SELECT model FROM usage m WHERE m.session_ref=b.session_ref AND m.model IS NOT NULL
                         GROUP BY model ORDER BY COUNT(*) DESC LIMIT 1) AS model
            FROM ({base}) b ORDER BY last_active DESC LIMIT ? OFFSET ?""",
        params + [page_size, (page - 1) * page_size],
    ).fetchall()
    return {"data": [dict(r) for r in rows], "meta": PageMeta(total=total, page=page, page_size=page_size)}


@router.get("/{session_id}", response_model=Envelope[SessionDetail], summary="One session's requests and tools")
def session_detail(session_id: str, conn=Depends(get_db)):
    sref = conn.execute("SELECT id FROM sessions WHERE session_id=?", (session_id,)).fetchone()
    if not sref:
        raise HTTPException(status_code=404, detail="Session not found")
    usage = conn.execute(
        """SELECT id,event_time,project,client,model,input_tokens,output_tokens,total_tokens
           FROM v_usage WHERE session_ref=? ORDER BY event_time DESC""",
        (sref[0],),
    ).fetchall()
    tools = conn.execute(
        "SELECT tool_name, COUNT(*) AS calls FROM tool_calls WHERE session_ref=? GROUP BY tool_name ORDER BY calls DESC",
        (sref[0],),
    ).fetchall()
    return {"data": {"usage": [dict(r) for r in usage], "tools": [dict(r) for r in tools]}}
