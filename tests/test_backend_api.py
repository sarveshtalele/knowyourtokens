"""REST API tests: seeded through the real ingest path (reconcile + hook)."""

import io
import json

import pytest
from fastapi.testclient import TestClient

from telemetry import collector
from telemetry.reconcile import reconcile
from tests.conftest import assistant, user, write_transcript

U = {"input_tokens": 100, "output_tokens": 200}


@pytest.fixture
def client(env, monkeypatch):
    write_transcript(
        env,
        [
            user("short prompt " + "x" * 5000, ts="2024-01-01T23:30:00.000Z"),
            assistant(
                [{"type": "text", "text": "short response"}], msg_id="m1", usage=U, ts="2024-01-01T23:30:01.000Z"
            ),
            assistant(
                [
                    {"type": "tool_use", "id": "t1", "name": "mcp__github__search_issues", "input": {}},
                    {"type": "tool_use", "id": "t2", "name": "mcp__github__create_pr", "input": {}},
                    {"type": "tool_use", "id": "t3", "name": "mcp__linear__list_issues", "input": {}},
                    {"type": "tool_use", "id": "t4", "name": "Skill", "input": {"skill": "code-review"}},
                ],
                msg_id="m2",
                usage={"input_tokens": 1, "output_tokens": 1},
                ts="2024-01-02T09:00:00.000Z",
            ),
            user("=cmd|'/c calc'!A1", ts="2024-01-02T09:01:00.000Z"),
            assistant(
                [{"type": "text", "text": "ok"}], msg_id="m3", usage={"input_tokens": 1}, ts="2024-01-02T09:01:01.000Z"
            ),
        ],
        project="-tmp-demo-project",
    )
    reconcile()
    for event in ("PostToolUse", "PostToolUse", "PreToolUse"):
        monkeypatch.setattr(
            "sys.stdin",
            io.StringIO(
                json.dumps({"hook_event_name": event, "session_id": "sess-1", "cwd": "/tmp/demo", "tool_name": "Read"})
            ),
        )
        collector.main()
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["database"] == "ok" and body["schema_version"] >= 7


def test_usage_list_and_detail(client):
    listing = client.get("/api/v1/usage?sort=time&order=asc").json()
    assert listing["meta"]["total"] == 3
    first = listing["data"][0]
    assert first["project"] == "demo" and first["total_tokens"] == 300
    detail = client.get(f"/api/v1/usage/{first['id']}").json()["data"]
    assert len(detail["prompt_full"]) > 5000
    assert detail["response_full"] == "short response"


def test_usage_detail_404(client):
    resp = client.get("/api/v1/usage/999999")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "http_error"


def test_summary_and_filters(client):
    data = client.get("/api/v1/usage/summary").json()["data"]
    assert data["total_requests"] == 3 and data["total_tokens"] == 303
    assert client.get("/api/v1/usage/summary?project=nope").json()["data"]["total_requests"] == 0


def test_end_date_includes_whole_day(client):
    # Regression: end=2024-01-01 used to exclude every row on that day.
    data = client.get("/api/v1/usage/summary?start=2024-01-01&end=2024-01-01").json()["data"]
    assert data["total_requests"] == 1


def test_timezone_shifts_day_buckets(client):
    utc = {r["day"]: r["requests"] for r in client.get("/api/v1/usage/timeline").json()["data"]}
    ist = {r["day"]: r["requests"] for r in client.get("/api/v1/usage/timeline?tz_offset=-330").json()["data"]}
    assert utc == {"2024-01-01": 1, "2024-01-02": 2}
    assert ist == {"2024-01-02": 3}  # 23:30 UTC is already Jan 2 in India


def test_invalid_dates_rejected(client):
    assert client.get("/api/v1/usage/summary?start=yesterday").status_code == 422
    assert client.get("/api/v1/usage/summary?start=2024-02-01&end=2024-01-01").status_code == 422


def test_projects(client):
    rows = client.get("/api/v1/projects").json()["data"]
    assert rows[0]["project"] == "demo" and rows[0]["requests"] == 3
    assert client.get("/api/v1/projects/demo").json()["data"]["total_tokens"] == 303
    assert client.get("/api/v1/projects/missing").status_code == 404


def test_project_attribution_summary(client):
    data = client.get("/api/v1/projects/demo/attribution-summary").json()["data"]
    assert data["top_skill"]["skill_name"] == "code-review"
    assert data["top_mcp_server"] == {"server_name": "github", "call_count": 2}
    assert data["top_hook"]["hook_name"] == "PostToolUse"


def test_unknown_project_attribution_summary_is_empty(client):
    data = client.get("/api/v1/projects/does-not-exist/attribution-summary").json()["data"]
    assert data == {"top_skill": None, "top_mcp_server": None, "top_hook": None}


def test_mcp_groups_by_server(client):
    by_name = {r["server_name"]: r for r in client.get("/api/v1/mcp").json()["data"]}
    assert by_name["github"]["call_count"] == 2 and by_name["linear"]["call_count"] == 1


def test_tools_skills_sessions_clients_events(client):
    assert {r["tool_name"] for r in client.get("/api/v1/tools").json()["data"]} >= {"Skill"}
    assert client.get("/api/v1/skills").json()["data"][0]["skill_name"] == "code-review"
    sessions = client.get("/api/v1/sessions").json()
    assert sessions["meta"]["total"] == 1 and sessions["data"][0]["model"] == "claude-x"
    assert client.get("/api/v1/sessions/sess-1").json()["data"]["tools"]
    assert client.get("/api/v1/clients").json()["data"][0]["requests"] == 3
    assert client.get("/api/v1/events?event_type=PostToolUse").json()["meta"]["total"] == 2


def test_settings(client):
    data = client.get("/api/v1/settings").json()["data"]
    assert data["table_counts"]["usage"] == 3
    assert {e["name"] for e in data["exporters"]} == {"otlp", "webhook"}


def test_reconcile_endpoint(client):
    assert client.post("/api/v1/settings/reconcile").json()["data"]["changed"] == 0


def test_reports(client):
    preview = client.get("/api/v1/reports/preview?kind=projects&project=demo").json()["data"]
    assert preview["row_count"] == 1 and preview["sample"][0]["top_tool"]
    csv_resp = client.get("/api/v1/reports/export?kind=requests&format=csv")
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert csv_resp.text.splitlines()[0].startswith("event_time,project,session_id")
    assert "cost_usd" not in csv_resp.text
    assert ",=cmd|" not in csv_resp.text and ",'=cmd|" in csv_resp.text
    body = client.get("/api/v1/reports/export?kind=projects&format=json").json()
    assert body[0]["project"] == "demo"
    nd = client.get("/api/v1/reports/export?format=ndjson&limit=2").text.strip().splitlines()
    assert len(nd) == 2
    assert client.get("/api/v1/reports/export?kind=bogus").status_code == 422


def test_dns_rebinding_host_rejected(client):
    assert client.get("/api/v1/usage", headers={"Host": "evil.example:8000"}).status_code == 403
    assert client.get("/api/v1/usage", headers={"Host": "127.0.0.1:8000"}).status_code == 200


def test_cross_origin_post_rejected(client):
    assert client.post("/api/v1/settings/reconcile", headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.post("/api/v1/settings/reconcile", headers={"Origin": "http://localhost:5173"}).status_code == 200


def test_security_headers(client):
    headers = client.get("/api/v1/usage").headers
    assert headers["x-content-type-options"] == "nosniff" and headers["cache-control"] == "no-store"


def test_websocket_rejects_foreign_origin(client):
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/live", headers={"Origin": "https://evil.example"}) as ws:
            ws.receive_text()


def test_openapi_is_typed(client):
    spec = client.get("/openapi.json").json()
    assert spec["info"]["title"] == "Token Telemetry API"
    assert "UsageRow" in spec["components"]["schemas"]


def test_ingest_any_agent_is_idempotent_and_listed_as_a_client(client):
    body = {
        "agent": "Antigravity",
        "records": [
            {
                "request_id": "ag-1",
                "session_id": "ag-sess",
                "cwd": "/work/shop",
                "model": "gemini-3-pro",
                "input_tokens": 1200,
                "output_tokens": 300,
                "cache_read_tokens": 5000,
                "prompt": "fix the cart",
                "tool_calls": [{"name": "read_file", "input": {"file_path": "/work/shop/cart.ts"}}, "run_command"],
            }
        ],
    }
    first = client.post("/api/v1/ingest", json=body)
    assert first.status_code == 200, first.text
    assert first.json()["data"] == {"accepted": 1, "new": 1}
    again = client.post("/api/v1/ingest", json=body).json()["data"]
    assert again["new"] == 0  # same request_id: no double count

    clients = {c["client"]: c for c in client.get("/api/v1/clients").json()["data"]}
    assert clients["Antigravity"]["total_tokens"] == 6500
    tools = {t["tool_name"] for t in client.get("/api/v1/tools").json()["data"]}
    assert {"read_file", "run_command"} <= tools


def test_ingest_rejects_cross_site_posts(client):
    r = client.post("/api/v1/ingest", json={"agent": "x", "records": []}, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403
