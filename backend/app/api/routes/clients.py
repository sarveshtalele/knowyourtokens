from fastapi import APIRouter, Depends

from ...deps import Filters, get_db
from ...schemas import ClientStats, Envelope

router = APIRouter()


@router.get("", response_model=Envelope[list[ClientStats]], summary="Usage per client / IDE")
def list_clients(f: Filters = Depends(), conn=Depends(get_db)):
    where, params = f.where(client_col=None)
    where = f"{where} {'AND' if where else 'WHERE'} client IS NOT NULL AND client != ''"
    rows = conn.execute(
        f"""SELECT client, COUNT(DISTINCT project_id) AS projects, COUNT(DISTINCT session_ref) AS sessions,
                   COALESCE(SUM(total_tokens),0) AS total_tokens, COUNT(*) AS requests
            FROM v_usage {where} GROUP BY client ORDER BY total_tokens DESC""",
        params,
    ).fetchall()
    return {"data": [dict(r) for r in rows]}
