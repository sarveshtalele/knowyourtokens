"""Python client for the Know Your Tokens local REST API.

from knowyourtokens_client import KnowYourTokens

tt = KnowYourTokens()                       # http://127.0.0.1:8000
print(tt.summary(start="2025-01-01")["total_tokens"])
for row in tt.iter_usage(project="my-repo"):
    ...
"""

from .client import ApiError, KnowYourTokens
from .webhooks import verify_signature

__all__ = ["KnowYourTokens", "ApiError", "verify_signature"]
__version__ = "2.4.0"
