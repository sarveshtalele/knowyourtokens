from fastapi import APIRouter, Depends

from ...deps import Filters, get_db
from ...schemas import Envelope, SkillStats

router = APIRouter()


@router.get("", response_model=Envelope[list[SkillStats]], summary="Skill activations")
def list_skills(f: Filters = Depends(), conn=Depends(get_db)):
    where, params = f.where(model_col=None)
    rows = conn.execute(
        f"""SELECT skill_name, plugin_name, trigger_type, COUNT(*) AS call_count, MAX(event_time) AS last_activated
            FROM v_skill_events {where}
            GROUP BY skill_name, COALESCE(plugin_name,''), COALESCE(trigger_type,'')
            ORDER BY call_count DESC, skill_name""",
        params,
    ).fetchall()
    return {"data": [dict(r) for r in rows]}
