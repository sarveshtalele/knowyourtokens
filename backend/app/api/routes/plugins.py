from fastapi import APIRouter, Depends

from ...deps import get_db
from ...schemas import Envelope, PluginsPayload

router = APIRouter()


@router.get("", response_model=Envelope[PluginsPayload], summary="Plugins, hooks, and subagents")
def plugins(conn=Depends(get_db)):
    skill_plugins = conn.execute(
        """SELECT plugin_name, COUNT(*) AS call_count, COUNT(DISTINCT skill_name) AS skills,
                  MAX(event_time) AS last_used
           FROM skill_events WHERE plugin_name IS NOT NULL AND plugin_name != ''
           GROUP BY plugin_name ORDER BY call_count DESC"""
    ).fetchall()
    hooks = conn.execute(
        "SELECT event_type AS hook_name, COUNT(*) AS call_count FROM events GROUP BY event_type ORDER BY call_count DESC"
    ).fetchall()
    agents = conn.execute(
        """SELECT agent_type, COUNT(*) AS call_count FROM events
           WHERE agent_type IS NOT NULL AND agent_type != '' GROUP BY agent_type ORDER BY call_count DESC"""
    ).fetchall()
    return {
        "data": {
            "plugins": [dict(r) for r in skill_plugins],
            "hooks": [dict(r) for r in hooks],
            "agents": [dict(r) for r in agents],
        }
    }
