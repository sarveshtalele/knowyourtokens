"""SDK against a real backend served by uvicorn in a thread."""

import socket
import sys
import threading
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from tokentelemetry_client import ApiError, TokenTelemetry, verify_signature  # noqa: E402


@pytest.fixture
def api(env):
    import uvicorn

    from telemetry.reconcile import reconcile
    from tests.conftest import assistant, user, write_transcript

    write_transcript(
        env,
        [
            user("hello"),
            assistant([{"type": "text", "text": "hi"}], msg_id="m1", usage={"input_tokens": 3, "output_tokens": 4}),
            user("again"),
            assistant(
                [{"type": "tool_use", "id": "t1", "name": "mcp__gh__x", "input": {}}],
                msg_id="m2",
                usage={"input_tokens": 1},
            ),
        ],
    )
    reconcile()
    from app.main import app

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    while not server.started:
        time.sleep(0.05)
    yield TokenTelemetry(f"http://127.0.0.1:{port}", tz_offset=0)
    server.should_exit = True
    thread.join(5)


def test_end_to_end(api):
    assert api.health()["status"] == "ok"
    assert api.summary()["total_tokens"] == 8
    rows = list(api.iter_usage(page_size=1))
    assert len(rows) == 2
    assert api.request(rows[0]["id"])["id"] == rows[0]["id"]
    assert api.projects()[0]["project"] == "demo"
    assert api.project("demo")["requests"] == 2
    assert api.mcp_servers()[0]["server_name"] == "gh"
    assert list(api.iter_sessions())[0]["session_id"] == "sess-1"
    assert api.timeline()[0]["requests"] == 2
    assert b"total_tokens" in api.export(fmt="ndjson")
    assert api.reconcile()["changed"] == 0


def test_errors_are_typed(api):
    with pytest.raises(ApiError) as info:
        api.request(424242)
    assert info.value.status == 404


def test_verify_signature():
    import hashlib
    import hmac

    body = b'{"type":"usage.batch"}'
    sig = "sha256=" + hmac.new(b"k", body, hashlib.sha256).hexdigest()
    assert verify_signature("k", body, sig)
    assert not verify_signature("k", body + b" ", sig)
    assert not verify_signature("k", body, "")
