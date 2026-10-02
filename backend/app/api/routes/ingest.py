from fastapi import APIRouter
from starlette.concurrency import run_in_threadpool

from telemetry.ingest import ingest

from ...schemas import Envelope, IngestRequest, IngestResult

router = APIRouter()


@router.post("", response_model=Envelope[IngestResult], summary="Push usage from any agent")
async def post_ingest(body: IngestRequest):
    """Record model requests from an agent without readable local logs
    (Antigravity, Cursor, your own agent). Same pipeline as file sources;
    `request_id` makes retries idempotent."""
    records = [r.model_dump() for r in body.records]
    for r in records:
        r["tool_calls"] = [
            t if isinstance(t, str) else {k: v for k, v in t.items() if v is not None} for t in r["tool_calls"]
        ]
    result = await run_in_threadpool(ingest, body.agent, records)
    return {"data": result}
