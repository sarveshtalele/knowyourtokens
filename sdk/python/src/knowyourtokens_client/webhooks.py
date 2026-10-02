import hashlib
import hmac


def verify_signature(secret: str, body: bytes, header: str) -> bool:
    """Check an ``X-KnowYourTokens-Signature`` header against the raw request body.

    Use the exact bytes you received (before JSON parsing)."""
    if not header or not header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
