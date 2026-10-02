"""telemetry/reconcile.py: transcript ingestion."""

from telemetry.db import connect
from telemetry.reconcile import reconcile
from tests.conftest import assistant, user, write_transcript

U = {"input_tokens": 5, "output_tokens": 10, "cache_read_input_tokens": 100, "cache_creation_input_tokens": 1}


def _rows(sql, *args):
    conn = connect()
    try:
        return [dict(r) for r in conn.execute(sql, args).fetchall()]
    finally:
        conn.close()


def test_multi_block_message_counts_once(env):
    # Claude Code writes one line per content block, each repeating usage.
    write_transcript(
        env,
        [
            user("hi"),
            assistant([{"type": "thinking", "thinking": "..."}], msg_id="m1", request_id="r1", usage=U),
            assistant([{"type": "text", "text": "part one"}], msg_id="m1", request_id="r1", usage=U),
            assistant(
                [{"type": "tool_use", "id": "tu1", "name": "Read", "input": {"file_path": "a.py"}}],
                msg_id="m1",
                request_id="r1",
                usage=U,
            ),
        ],
    )
    reconcile()
    rows = _rows("SELECT total_tokens, response_full FROM usage")
    assert len(rows) == 1
    assert rows[0]["total_tokens"] == 116
    assert "part one" in rows[0]["response_full"]


def test_splits_plugin_prefixed_skill(env):
    write_transcript(
        env,
        [
            user("go"),
            assistant(
                [{"type": "tool_use", "id": "tu1", "name": "Skill", "input": {"skill": "superpowers:brainstorming"}}]
            ),
        ],
    )
    reconcile()
    row = _rows("SELECT skill_name, plugin_name FROM skill_events")[0]
    assert row == {"skill_name": "brainstorming", "plugin_name": "superpowers"}


def test_explicit_plugin_field_and_unnamespaced(env):
    write_transcript(
        env,
        [
            user("go"),
            assistant(
                [
                    {
                        "type": "tool_use",
                        "id": "tu1",
                        "name": "Skill",
                        "input": {"skill": "brainstorming", "plugin_name": "sp"},
                    },
                    {"type": "tool_use", "id": "tu2", "name": "Skill", "input": {"skill": "code-review"}},
                ]
            ),
        ],
    )
    reconcile()
    rows = {r["skill_name"]: r["plugin_name"] for r in _rows("SELECT skill_name, plugin_name FROM skill_events")}
    assert rows == {"brainstorming": "sp", "code-review": None}


def test_accumulates_all_tool_results_since_last_reply(env):
    write_transcript(
        env,
        [
            user("read three files and summarize"),
            assistant(
                [
                    {"type": "tool_use", "id": "tu1", "name": "Read", "input": {"file_path": "a.txt"}},
                    {"type": "tool_use", "id": "tu2", "name": "Read", "input": {"file_path": "b.txt"}},
                ]
            ),
            user([{"type": "tool_result", "tool_use_id": "tu1", "content": "contents of A"}]),
            user([{"type": "tool_result", "tool_use_id": "tu2", "content": "contents of B"}]),
            assistant([{"type": "text", "text": "Here is the summary."}], msg_id="m2", usage=U),
        ],
    )
    reconcile()
    prompt = _rows("SELECT prompt_full FROM usage")[0]["prompt_full"]
    assert prompt.index("contents of A") < prompt.index("contents of B")


def test_resets_context_after_each_reply(env):
    write_transcript(
        env,
        [
            user("first message"),
            assistant([{"type": "text", "text": "r1"}], msg_id="m1", usage=U),
            user("second message"),
            assistant([{"type": "text", "text": "r2"}], msg_id="m2", usage=U),
        ],
    )
    reconcile()
    assert [r["prompt_full"] for r in _rows("SELECT prompt_full FROM usage ORDER BY id")] == [
        "first message",
        "second message",
    ]


def test_incremental_append_keeps_pending_context(env):
    path = write_transcript(
        env, [user("first"), assistant([{"type": "text", "text": "a"}], msg_id="m1", usage=U), user("carried over")]
    )
    assert reconcile() == (1, 1)
    assert reconcile() == (0, 1)  # unchanged file is skipped
    with path.open("a", encoding="utf-8") as fh:
        import json

        fh.write(json.dumps(assistant([{"type": "text", "text": "b"}], msg_id="m2", usage=U)) + "\n")
    assert reconcile() == (1, 1)
    rows = _rows("SELECT prompt_full, transcript_line FROM usage ORDER BY id")
    assert len(rows) == 2
    assert rows[1]["prompt_full"] == "carried over"
    assert rows[1]["transcript_line"] == 4


def test_partial_trailing_line_waits(env):
    path = write_transcript(env, [user("x")])
    with path.open("a", encoding="utf-8") as fh:
        fh.write('{"type": "assistant", "message": {"role": "assis')  # write in progress
    reconcile()
    assert _rows("SELECT offset_bytes FROM transcripts")[0]["offset_bytes"] < path.stat().st_size


def test_file_without_trailing_newline_is_fully_read(env):
    write_transcript(
        env, [user("x"), assistant([{"type": "text", "text": "y"}], msg_id="m1", usage=U)], trailing_newline=False
    )
    reconcile()
    assert len(_rows("SELECT id FROM usage")) == 1


def test_truncated_transcript_is_reingested(env):
    path = write_transcript(
        env,
        [
            user("a"),
            assistant([{"type": "text", "text": "1"}], msg_id="m1", usage=U),
            user("b"),
            assistant([{"type": "text", "text": "2"}], msg_id="m2", usage=U),
        ],
    )
    reconcile()
    write_transcript(env, [user("a"), assistant([{"type": "text", "text": "1"}], msg_id="m1", usage=U)])
    assert path.stat().st_size > 0
    reconcile()
    assert len(_rows("SELECT id FROM usage")) == 1


def test_projects_with_same_folder_name_stay_separate(env):
    write_transcript(
        env,
        [
            user("x", cwd="/work/a/api", session="s1"),
            assistant([{"type": "text", "text": "y"}], msg_id="m1", usage=U, cwd="/work/a/api", session="s1"),
        ],
        name="one.jsonl",
    )
    write_transcript(
        env,
        [
            user("x", cwd="/work/b/api", session="s2"),
            assistant([{"type": "text", "text": "y"}], msg_id="m2", usage=U, cwd="/work/b/api", session="s2"),
        ],
        name="two.jsonl",
    )
    reconcile()
    names = sorted(r["name"] for r in _rows("SELECT name FROM projects"))
    assert names == ["api", "api (b)"]


def test_attributions_split_tokens_across_tool_paths(env):
    write_transcript(
        env,
        [
            user("edit"),
            assistant(
                [
                    {"type": "tool_use", "id": "tu1", "name": "Read", "input": {"file_path": "/x/a.py"}},
                    {"type": "tool_use", "id": "tu2", "name": "Bash", "input": {"command": "ls"}},
                ],
                msg_id="m1",
                usage={"input_tokens": 100},
            ),
        ],
    )
    reconcile()
    rows = _rows("SELECT path, category, estimated_tokens FROM attributions ORDER BY path")
    assert sum(r["estimated_tokens"] for r in rows) == 100
    assert {r["category"] for r in rows} == {".py", "[unattributed]"}


def test_timestamps_are_normalized_to_utc(env):
    write_transcript(
        env,
        [user("x"), assistant([{"type": "text", "text": "y"}], msg_id="m1", usage=U, ts="2025-01-01T12:00:00+05:30")],
    )
    reconcile()
    assert _rows("SELECT event_time FROM usage")[0]["event_time"] == "2025-01-01T06:30:00.000Z"


def test_full_text_can_be_disabled(env, monkeypatch):
    monkeypatch.setenv("TOKENTELEMETRY_STORE_FULL_TEXT", "0")
    write_transcript(env, [user("secret plan"), assistant([{"type": "text", "text": "ok"}], msg_id="m1", usage=U)])
    reconcile()
    row = _rows("SELECT prompt_full, response_full, prompt_preview FROM usage")[0]
    assert row["prompt_full"] is None and row["response_full"] is None
    assert row["prompt_preview"] == "secret plan"


def test_secrets_are_redacted(env):
    write_transcript(
        env,
        [user("key is sk-ant-abcdefghijklmnop123"), assistant([{"type": "text", "text": "ok"}], msg_id="m1", usage=U)],
    )
    reconcile()
    assert "sk-ant" not in _rows("SELECT prompt_full FROM usage")[0]["prompt_full"]


def test_cd_inside_a_session_keeps_one_project(env):
    write_transcript(
        env,
        [
            user("start", cwd="/work/repo"),
            assistant([{"type": "text", "text": "a"}], msg_id="m1", usage=U, cwd="/work/repo"),
            user("cd into a subfolder", cwd="/work/repo/backend"),
            assistant([{"type": "text", "text": "b"}], msg_id="m2", usage=U, cwd="/work/repo/backend"),
        ],
    )
    reconcile()
    assert [r["name"] for r in _rows("SELECT name FROM projects")] == ["repo"]
    assert len(_rows("SELECT id FROM usage WHERE project_id IS NOT NULL")) == 2
