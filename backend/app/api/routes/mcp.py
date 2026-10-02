from fastapi import APIRouter, Depends

from ...deps import Filters, get_db
from ...schemas import Envelope, McpServer

router = APIRouter()


@router.get("", response_model=Envelope[list[McpServer]], summary="MCP servers, by call count")
def list_mcp_servers(f: Filters = Depends(), conn=Depends(get_db)):
    # tool_calls comes from transcripts too, so this includes history from
    # before the hooks were installed -- not just live hook events.
    where, params = f.where(model_col=None)
    where = f"{where} {'AND' if where else 'WHERE'} mcp_server IS NOT NULL"
    rows = conn.execute(
        f"""SELECT mcp_server AS server_name, COUNT(*) AS call_count, COUNT(DISTINCT session_ref) AS sessions,
                   COUNT(DISTINCT tool_name) AS tools, MIN(event_time) AS first_seen, MAX(event_time) AS last_seen
            FROM v_tool_calls {where} GROUP BY mcp_server ORDER BY call_count DESC""",
        params,
    ).fetchall()
    return {"data": [dict(r) for r in rows]}
