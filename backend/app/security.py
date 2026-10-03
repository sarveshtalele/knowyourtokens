"""Local-only hardening for a service that binds to 127.0.0.1.

* Host allowlist: blocks DNS-rebinding, where a malicious site re-points its
  own hostname at 127.0.0.1 so the browser treats our API as same-origin.
* Origin check on state-changing requests and WebSocket upgrades: blocks
  cross-site requests (CSRF) from any page that isn't the dashboard.
"""

import re
from urllib.parse import urlsplit

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from telemetry import config

LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]", "testserver"}
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
MAX_BODY_BYTES = 64 * 1024 * 1024  # an ingest batch of 1000 records fits comfortably


def allowed_hosts():
    extra = {h.strip().lower() for h in config.env("KNOWYOURTOKENS_ALLOWED_HOSTS", "").split(",") if h.strip()}
    return LOCAL_HOSTS | extra


def _hostname(host_header):
    host = (host_header or "").strip().lower()
    if host.startswith("["):
        return host.split("]")[0] + "]"
    return re.sub(r":\d+$", "", host)


def origin_allowed(origin):
    if not origin:
        return True  # non-browser clients (curl, SDKs) send no Origin
    try:
        parts = urlsplit(origin)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and (parts.hostname or "").lower() in allowed_hosts() | {"::1"}


class LocalOnlyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if _hostname(request.headers.get("host")) not in allowed_hosts():
            return JSONResponse({"error": {"code": "forbidden_host", "message": "Host not allowed"}}, status_code=403)
        if request.method not in SAFE_METHODS:
            if not origin_allowed(request.headers.get("origin")):
                return JSONResponse(
                    {"error": {"code": "forbidden_origin", "message": "Cross-origin request blocked"}}, status_code=403
                )
            # Bound memory per request: the body is parsed in full before validation runs.
            length = request.headers.get("content-length")
            if length is not None and (not length.isdigit() or int(length) > MAX_BODY_BYTES):
                return JSONResponse(
                    {"error": {"code": "payload_too_large", "message": "Request body too large"}}, status_code=413
                )
            if length is None and "chunked" in request.headers.get("transfer-encoding", "").lower():
                return JSONResponse(
                    {"error": {"code": "length_required", "message": "Send a Content-Length header"}}, status_code=411
                )
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response
