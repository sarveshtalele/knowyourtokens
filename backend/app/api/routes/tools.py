from fastapi import APIRouter, Depends, HTTPException

from ...deps import Filters, get_db
from ...schemas import Envelope, ToolStats

router = APIRouter()

COLUMNS = """tool_name, MAX(mcp_server) AS mcp_server, COUNT(*) AS call_count,
             COUNT(DISTINCT session_ref) AS unique_sessions, COUNT(DISTINCT project_id) AS projects,
             MIN(event_time) AS first_seen, MAX(event_time) AS last_seen"""


@router.get("", response_model=Envelope[list[ToolStats]], summary="Tool call counts")
def list_tools(f: Filters = Depends(), conn=Depends(get_db)):
    where, params = f.where(model_col=None)
    rows = conn.execute(
        f"SELECT {COLUMNS} FROM v_tool_calls {where} GROUP BY tool_name ORDER BY call_count DESC", params
    ).fetchall()
    return {"data": [dict(r) for r in rows]}


@router.get("/{tool_name}", response_model=Envelope[ToolStats], summary="One tool's stats")
def tool_detail(tool_name: str, conn=Depends(get_db)):
    row = conn.execute(
        f"SELECT {COLUMNS} FROM v_tool_calls WHERE tool_name=? GROUP BY tool_name", (tool_name,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Tool not found")
    return {"data": dict(row)}
