"""Local-only hardening for a service that binds to 127.0.0.1.

* Host allowlist: blocks DNS-rebinding, where a malicious site re-points its
  own hostname at 127.0.0.1 so the browser treats our API as same-origin.
* Origin check on state-changing requests and WebSocket upgrades: blocks
  cross-site requests (CSRF) from any page that isn't the dashboard.
"""

import os
import re
from urllib.parse import urlsplit

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]", "testserver"}
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def allowed_hosts():
    extra = {h.strip().lower() for h in os.environ.get("TOKENTELEMETRY_ALLOWED_HOSTS", "").split(",") if h.strip()}
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
        if request.method not in SAFE_METHODS and not origin_allowed(request.headers.get("origin")):
            return JSONResponse(
                {"error": {"code": "forbidden_origin", "message": "Cross-origin request blocked"}}, status_code=403
            )
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response
