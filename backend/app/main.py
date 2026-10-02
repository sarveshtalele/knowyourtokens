import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from telemetry import __version__
from telemetry.db import SCHEMA_VERSION, connect

from . import bootstrap  # noqa: F401
from .api.router import api_router
from .api.routes.live import broadcaster
from .api.routes.live import router as live_router
from .schemas import Health
from .security import LocalOnlyMiddleware

log = logging.getLogger("tokentelemetry.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect().close()  # create / migrate the schema once, up front
    broadcaster.start()
    yield
    await broadcaster.stop()


app = FastAPI(
    title="Token Telemetry API",
    version=__version__,
    summary="Local-first token, tool, skill and MCP observability for Claude Code.",
    description=(
        "Read-only REST API over the local Token Telemetry database. Binds to 127.0.0.1; "
        "see docs/API.md for conventions (envelopes, filters, pagination, time zones)."
    ),
    license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.add_middleware(LocalOnlyMiddleware)

app.include_router(api_router, prefix="/api/v1")
app.include_router(live_router)


def _error(status, code, message, details=None):
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    # "detail" kept for clients written against FastAPI's default shape.
    body["detail"] = message if details is None else details
    return JSONResponse(body, status_code=status)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return _error(exc.status_code, "http_error", str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return _error(422, "validation_error", "Invalid request parameters", exc.errors())


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return _error(500, "internal_error", "Internal server error")


@app.get("/health", response_model=Health, tags=["meta"], summary="Liveness + database check")
def health():
    try:
        conn = connect(readonly=True)
        try:
            conn.execute("SELECT 1 FROM usage LIMIT 1").fetchall()
        finally:
            conn.close()
        db = "ok"
    except Exception as exc:  # noqa: BLE001
        log.warning("health check DB failure: %s", exc)
        db = "error"
    status = "ok" if db == "ok" else "degraded"
    return JSONResponse(
        {"status": status, "version": __version__, "schema_version": SCHEMA_VERSION, "database": db},
        status_code=200 if db == "ok" else 503,
    )
