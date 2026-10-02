"""Python client for the Token Telemetry local REST API.

from tokentelemetry_client import TokenTelemetry

tt = TokenTelemetry()                       # http://127.0.0.1:8000
print(tt.summary(start="2025-01-01")["total_tokens"])
for row in tt.iter_usage(project="my-repo"):
    ...
"""

from .client import ApiError, TokenTelemetry
from .webhooks import verify_signature

__all__ = ["TokenTelemetry", "ApiError", "verify_signature"]
__version__ = "2.2.0"
