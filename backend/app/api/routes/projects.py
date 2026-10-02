from fastapi import APIRouter, Depends, HTTPException, Query

from ...deps import Filters, get_db
from ...schemas import (
    AttributionSummary,
    CategoryTokens,
    Envelope,
    PathTokens,
    ProjectDetail,
    ProjectSummary,
)

router = APIRouter()


def _project_id(conn, project):
    row = conn.execute("SELECT id FROM projects WHERE name=?", (project,)).fetchone()
    return row[0] if row else None


@router.get("", response_model=Envelope[list[ProjectSummary]], summary="Every project, by token usage")
def list_projects(f: Filters = Depends(), conn=Depends(get_db)):
    where, params = f.where(project_col=None)
    rows = conn.execute(
        f"""SELECT p.name AS project, p.project_key, COALESCE(SUM(u.total_tokens),0) AS total_tokens,
                   COUNT(u.id) AS requests, COUNT(DISTINCT u.session_ref) AS sessions,
                   COUNT(DISTINCT u.client) AS client_count, COUNT(DISTINCT u.model) AS model_count,
                   MAX(u.event_time) AS last_activity
            FROM projects p JOIN (SELECT * FROM v_usage {where}) u ON u.project_id = p.id
            GROUP BY p.id ORDER BY total_tokens DESC""",
        params,
    ).fetchall()
    return {"data": [dict(r) for r in rows]}


@router.get("/{project}", response_model=Envelope[ProjectDetail], summary="One project's totals")
def project_detail(project: str, conn=Depends(get_db)):
    row = conn.execute(
        """SELECT p.name AS project, p.project_key, p.cwd, COALESCE(SUM(u.total_tokens),0) AS total_tokens,
                  COUNT(u.id) AS requests, COUNT(DISTINCT u.session_ref) AS sessions,
                  COUNT(DISTINCT u.client) AS clients, COUNT(DISTINCT u.model) AS models,
                  MIN(u.event_time) AS first_active, MAX(u.event_time) AS last_active
           FROM projects p LEFT JOIN v_usage u ON u.project_id = p.id
           WHERE p.name=? GROUP BY p.id""",
        (project,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"data": dict(row)}


@router.get(
    "/{project}/hotspots", response_model=Envelope[list[CategoryTokens]], summary="Estimated tokens by file category"
)
def hotspots(project: str, conn=Depends(get_db)):
    rows = conn.execute(
        """SELECT category, ROUND(SUM(estimated_tokens),1) AS estimated_tokens, COUNT(*) AS reference_count
           FROM attributions WHERE project_id=? GROUP BY category ORDER BY estimated_tokens DESC""",
        (_project_id(conn, project),),
    ).fetchall()
    return {"data": [dict(r) for r in rows]}


@router.get(
    "/{project}/attribution-summary",
    response_model=Envelope[AttributionSummary],
    summary="Top skill, MCP server, and hook",
)
def attribution_summary(project: str, conn=Depends(get_db)):
    pid = _project_id(conn, project)
    top_skill = conn.execute(
        """SELECT skill_name, COUNT(*) AS call_count FROM skill_events WHERE project_id=?
           GROUP BY skill_name ORDER BY call_count DESC, skill_name LIMIT 1""",
        (pid,),
    ).fetchone()
    top_mcp = conn.execute(
        """SELECT mcp_server AS server_name, COUNT(*) AS call_count FROM tool_calls
           WHERE project_id=? AND mcp_server IS NOT NULL
           GROUP BY mcp_server ORDER BY call_count DESC, mcp_server LIMIT 1""",
        (pid,),
    ).fetchone()
    top_hook = conn.execute(
        """SELECT event_type AS hook_name, COUNT(*) AS call_count FROM events WHERE project_id=?
           GROUP BY event_type ORDER BY call_count DESC, event_type LIMIT 1""",
        (pid,),
    ).fetchone()
    return {
        "data": {
            k: dict(v) if v else None
            for k, v in (("top_skill", top_skill), ("top_mcp_server", top_mcp), ("top_hook", top_hook))
        }
    }


@router.get("/{project}/paths", response_model=Envelope[list[PathTokens]], summary="Estimated tokens by file path")
def paths(project: str, limit: int = Query(200, ge=1, le=5000), conn=Depends(get_db)):
    rows = conn.execute(
        """SELECT path, MIN(category) AS category, ROUND(SUM(estimated_tokens),1) AS estimated_tokens,
                  COUNT(*) AS reference_count
           FROM attributions WHERE project_id=? GROUP BY path ORDER BY estimated_tokens DESC LIMIT ?""",
        (_project_id(conn, project), limit),
    ).fetchall()
    return {"data": [dict(r) for r in rows]}
