from fastapi import APIRouter, Depends

from ...deps import get_db
from ...schemas import Envelope, ProjectCategoryTokens

router = APIRouter()


@router.get(
    "", response_model=Envelope[list[ProjectCategoryTokens]], summary="Estimated tokens by project and file category"
)
def list_attributions(conn=Depends(get_db)):
    rows = conn.execute(
        """SELECT project, category, ROUND(SUM(estimated_tokens),1) AS estimated_tokens, COUNT(*) AS reference_count
           FROM v_attributions GROUP BY project_id, category ORDER BY estimated_tokens DESC"""
    ).fetchall()
    return {"data": [dict(r) for r in rows]}
