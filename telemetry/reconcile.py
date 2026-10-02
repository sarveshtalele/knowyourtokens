#!/usr/bin/env python3
"""Parse Claude Code session transcripts (~/.claude/projects/**/*.jsonl)
into exact per-request token usage, tool calls, and skill activations.

Ingest is incremental: each transcript's byte offset, line count, and the
not-yet-answered prompt context are stored in ``transcripts`` so a poll only
reads lines appended since the last one. A transcript that shrank (rewritten
or truncated) is re-read from the start.

One API request is one ``usage`` row. Claude Code writes an assistant
message as several lines (one per content block) that all repeat the same
``usage`` object, so rows are keyed by message id + request id and repeated
lines are merged rather than summed.
"""

import json
import logging

from telemetry import config
from telemetry.common import (
    classify_path,
    detect_client,
    extract_paths,
    extract_usage,
    first,
    mcp_server,
    normalize_time,
    redact,
    text_of_content,
    utc_now_iso,
)
from telemetry.db import connect, transaction
from telemetry.store import session_dims, upsert_session

log = logging.getLogger("telemetry.reconcile")

ATTRIBUTION_WINDOW = 5  # lines either side of a request that count as "its" tool calls
PROMPT_BLOCK_CAP = 8000
PROMPT_FULL_CAP = 40000
RESPONSE_FULL_CAP = 40000


class _Dims:
    """Per-transcript cache of project/session ids so a long transcript
    doesn't upsert the same dimension rows once per line.

    A session belongs to the project it started in: `cd` inside a session
    changes each line's cwd, but must not split one session across
    several "projects"."""

    def __init__(self, conn, path):
        self.conn, self.path = conn, path
        self.sessions, self.span = {}, {}

    def ids(self, session_id, cwd, client, when):
        cached = self.sessions.get(session_id)
        if cached is None:
            cached = self.sessions[session_id] = session_dims(self.conn, session_id, cwd, self.path, client, when)
        pid, sref = cached
        lo, hi = self.span.get(session_id, (when, when))
        self.span[session_id] = (min(lo, when), max(hi, when))
        return pid, sref

    def flush(self):
        for session_id, (lo, hi) in self.span.items():
            pid, _ = self.sessions[session_id]
            for seen in (lo, hi):
                upsert_session(self.conn, session_id, seen=seen)
                self.conn.execute(
                    """UPDATE projects SET
                         first_seen = CASE WHEN first_seen IS NULL OR ? < first_seen THEN ? ELSE first_seen END,
                         last_seen  = CASE WHEN last_seen  IS NULL OR ? > last_seen  THEN ? ELSE last_seen  END
                       WHERE id=?""",
                    (seen, seen, seen, seen, pid),
                )


def _read_new_lines(path, offset):
    """Complete lines appended after ``offset``. A trailing line with no
    newline is consumed only if it is already valid JSON (i.e. not a write
    still in progress)."""
    with open(path, "rb") as fh:
        fh.seek(offset)
        data = fh.read()
    if not data:
        return [], offset
    end = data.rfind(b"\n") + 1
    complete, tail = data[:end], data[end:]
    lines = complete.decode("utf-8", errors="replace").splitlines()
    consumed = end
    if tail.strip():
        try:
            json.loads(tail.decode("utf-8", errors="replace"))
            lines.append(tail.decode("utf-8", errors="replace"))
            consumed = len(data)
        except ValueError:
            pass
    return lines, offset + consumed


def _upsert_usage(conn, *, key, sref, pid, tid, line, when, usage, prompt, text):
    store_full = config.store_full_text()
    row = conn.execute(
        "SELECT id,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,response_full "
        "FROM usage WHERE message_key=?",
        (key,),
    ).fetchone()
    if row is None:
        conn.execute(
            """INSERT INTO usage(message_key,session_ref,project_id,transcript_id,transcript_line,event_time,model,
                                 provider,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,total_tokens,
                                 context_window,max_output_tokens,prompt_preview,response_preview,prompt_full,
                                 response_full)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                key,
                sref,
                pid,
                tid,
                line,
                when,
                usage["model"],
                usage["provider"],
                usage["input_tokens"],
                usage["output_tokens"],
                usage["cache_read_tokens"],
                usage["cache_write_tokens"],
                usage["total_tokens"],
                usage["context_window"],
                usage["max_output_tokens"],
                redact(prompt[:800]),
                redact(text[:1200]),
                redact(prompt) if store_full else None,
                redact(text[:RESPONSE_FULL_CAP]) if store_full else None,
            ),
        )
        return True
    # A repeated line of the same message: identical usage (take the max in
    # case a streaming split reports a partial count first), more text.
    merged = {
        k: max(row[k] or 0, usage[k])
        for k in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens")
    }
    response = row["response_full"] or ""
    if text and store_full:
        response = (response + "\n" + text if response else text)[:RESPONSE_FULL_CAP]
    conn.execute(
        """UPDATE usage SET input_tokens=?,output_tokens=?,cache_read_tokens=?,cache_write_tokens=?,total_tokens=?,
                            model=COALESCE(NULLIF(model,''),?),
                            response_full=?,
                            response_preview=COALESCE(NULLIF(response_preview,''),?)
           WHERE id=?""",
        (
            merged["input_tokens"],
            merged["output_tokens"],
            merged["cache_read_tokens"],
            merged["cache_write_tokens"],
            sum(merged.values()),
            usage["model"],
            redact(response) if store_full else None,
            redact(text[:1200]),
            row["id"],
        ),
    )
    return False


def _upsert_tool_call(conn, *, sref, pid, tid, line, when, model, name, tool_use_id, inp, cwd):
    conn.execute(
        """INSERT INTO tool_calls(session_ref,project_id,transcript_id,transcript_line,event_time,model,tool_name,
                                  mcp_server,tool_use_id,input_json)
           VALUES(?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(tool_use_id) DO UPDATE SET
             transcript_id=excluded.transcript_id, transcript_line=excluded.transcript_line,
             input_json=excluded.input_json, model=COALESCE(excluded.model, tool_calls.model)""",
        (
            sref,
            pid,
            tid,
            line,
            when,
            model or None,
            name,
            mcp_server(name),
            tool_use_id,
            redact(json.dumps(inp, ensure_ascii=False)),
        ),
    )
    tool_id = conn.execute("SELECT id FROM tool_calls WHERE tool_use_id=?", (tool_use_id,)).fetchone()[0]
    conn.execute("DELETE FROM tool_paths WHERE tool_call_id=?", (tool_id,))
    for p in extract_paths(inp, cwd):
        conn.execute(
            "INSERT OR IGNORE INTO tool_paths(tool_call_id,path,category) VALUES(?,?,?)", (tool_id, p, classify_path(p))
        )
    return tool_id


def _record_skill(conn, *, sref, pid, when, tool_use_id, inp):
    skill = first(inp, ["skill", "name", "skill_name"], "unknown")
    plugin = first(inp, ["plugin_name", "plugin"], None)
    # Plugin skills are commonly referenced as "plugin:skill".
    if not plugin and isinstance(skill, str) and ":" in skill:
        plugin, skill = skill.split(":", 1)
    conn.execute(
        """INSERT INTO skill_events(dedupe_key,session_ref,project_id,event_time,skill_name,plugin_name,trigger_type,
                                    source,payload_json)
           VALUES(?,?,?,?,?,?,?,?,?)
           ON CONFLICT(dedupe_key) DO UPDATE SET
             plugin_name=COALESCE(skill_events.plugin_name, excluded.plugin_name),
             skill_name=CASE WHEN skill_events.skill_name='unknown' THEN excluded.skill_name
                             ELSE skill_events.skill_name END""",
        (
            tool_use_id,
            sref,
            pid,
            when,
            str(skill),
            plugin,
            "tool",
            "transcript",
            json.dumps({"tool_use_id": tool_use_id, **inp}, ensure_ascii=False)[:4000],
        ),
    )


def ingest_lines(conn, path, lines, tid, start_line, pending):
    """Ingest already-read transcript lines. Returns (pending_context, first_touched_line)."""
    dims = _Dims(conn, path)
    last_time = None
    for idx, line in enumerate(lines, start_line + 1):
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        if not isinstance(obj, dict):
            continue

        msg = obj.get("message") if isinstance(obj.get("message"), dict) else {}
        role = msg.get("role") or obj.get("type")
        content = msg.get("content", obj.get("content", ""))
        text = text_of_content(content)
        cwd = first(obj, ["cwd", "working_directory"], None) or first(msg, ["cwd"], None)
        session_id = first(obj, ["session_id", "sessionId"], None) or path.stem
        when = normalize_time(first(obj, ["timestamp", "created_at", "createdAt"], None)) or last_time or utc_now_iso()
        last_time = when
        usage = extract_usage(obj)

        if role == "user" and text:
            pending.append(text[:PROMPT_BLOCK_CAP])

        blocks = content if isinstance(content, list) else []
        has_tool_use = any(isinstance(b, dict) and b.get("type") == "tool_use" for b in blocks)
        if not ((role == "assistant" and usage["total_tokens"] > 0) or has_tool_use):
            continue

        pid, sref = dims.ids(session_id, cwd, detect_client(path, obj), when)

        if role == "assistant" and usage["total_tokens"] > 0:
            msg_id = msg.get("id")
            key = f"{msg_id}:{obj.get('requestId') or ''}" if msg_id else f"{path}:{idx}"
            prompt = "\n\n---\n\n".join(pending)[:PROMPT_FULL_CAP]
            if _upsert_usage(
                conn, key=key, sref=sref, pid=pid, tid=tid, line=idx, when=when, usage=usage, prompt=prompt, text=text
            ):
                # That context has now been answered; the next request starts fresh.
                pending = []

        for n, b in enumerate(blocks):
            if not isinstance(b, dict) or b.get("type") != "tool_use":
                continue
            name = b.get("name") or "unknown"
            inp = b.get("input") if isinstance(b.get("input"), dict) else {}
            tool_use_id = b.get("id") or f"{path.stem}:{idx}:{n}:{name}"
            _upsert_tool_call(
                conn,
                sref=sref,
                pid=pid,
                tid=tid,
                line=idx,
                when=when,
                model=usage["model"],
                name=name,
                tool_use_id=tool_use_id,
                inp=inp,
                cwd=cwd,
            )
            if str(name).lower() == "skill":
                _record_skill(conn, sref=sref, pid=pid, when=when, tool_use_id=tool_use_id, inp=inp)
    dims.flush()
    return pending


def rebuild_attributions(conn, transcript_id=None, from_line=0):
    """Estimate per-tool/per-path token share for requests in one transcript
    at or after ``from_line`` (or every request, when transcript_id is None).

    Heuristic ('nearest_tool_weighted'): a request's exact token total is split
    evenly across tool calls within ATTRIBUTION_WINDOW lines of it in the same
    transcript, then each tool's share evenly across the file paths it touched."""
    if transcript_id is None:
        conn.execute("DELETE FROM attributions")
        usages = conn.execute(
            "SELECT id,transcript_id,transcript_line,total_tokens,project_id FROM usage "
            "WHERE total_tokens > 0 AND transcript_id IS NOT NULL"
        ).fetchall()
    else:
        lo = max(0, from_line - ATTRIBUTION_WINDOW)
        conn.execute(
            "DELETE FROM attributions WHERE usage_id IN "
            "(SELECT id FROM usage WHERE transcript_id=? AND transcript_line>=?)",
            (transcript_id, lo),
        )
        usages = conn.execute(
            "SELECT id,transcript_id,transcript_line,total_tokens,project_id FROM usage "
            "WHERE total_tokens > 0 AND transcript_id=? AND transcript_line>=?",
            (transcript_id, lo),
        ).fetchall()

    for usage_id, tid, line, total, pid in usages:
        tool_ids = [
            r[0]
            for r in conn.execute(
                """SELECT id FROM tool_calls
               WHERE transcript_id=? AND transcript_line BETWEEN ? AND ?
               ORDER BY ABS(transcript_line-?), transcript_line, id""",
                (tid, line - ATTRIBUTION_WINDOW, line + ATTRIBUTION_WINDOW, line),
            ).fetchall()
        ]
        if not tool_ids:
            continue
        tool_share = float(total) / len(tool_ids)
        for tool_id in tool_ids:
            paths = conn.execute(
                "SELECT path,category FROM tool_paths WHERE tool_call_id=? ORDER BY id", (tool_id,)
            ).fetchall() or [("[unattributed]", "[unattributed]")]
            share = tool_share / len(paths)
            conn.executemany(
                """INSERT INTO attributions(usage_id,tool_call_id,project_id,path,category,estimated_tokens,
                                            allocation_weight,method)
                   VALUES(?,?,?,?,?,?,?,'nearest_tool_weighted')""",
                [(usage_id, tool_id, pid, p, c, share, share / float(total)) for p, c in paths],
            )


def reconcile_file(conn, path, force=False):
    """Ingest whatever is new in one transcript. Returns True if anything was read."""
    try:
        stat = path.stat()
    except OSError:
        return False
    row = conn.execute(
        "SELECT id,mtime_ns,size_bytes,offset_bytes,line_count,pending_context FROM transcripts WHERE path=?",
        (str(path),),
    ).fetchone()
    if row and not force and row["mtime_ns"] == stat.st_mtime_ns and row["size_bytes"] == stat.st_size:
        return False

    with transaction(conn):
        if row is None:
            tid = conn.execute("INSERT INTO transcripts(path) VALUES(?)", (str(path),)).lastrowid
            offset, line_count, pending = 0, 0, []
        else:
            tid = row["id"]
            offset, line_count = row["offset_bytes"], row["line_count"]
            pending = json.loads(row["pending_context"] or "[]")
            if force or stat.st_size < offset:
                # Rewritten/truncated (or forced): start over for this file.
                conn.execute("DELETE FROM usage WHERE transcript_id=?", (tid,))
                conn.execute("DELETE FROM tool_calls WHERE transcript_id=?", (tid,))
                offset, line_count, pending = 0, 0, []
        lines, new_offset = _read_new_lines(path, offset)
        pending = ingest_lines(conn, path, lines, tid, line_count, pending)
        rebuild_attributions(conn, tid, line_count + 1)
        conn.execute(
            """UPDATE transcripts SET mtime_ns=?,size_bytes=?,offset_bytes=?,line_count=?,pending_context=?,
                                      reconciled_at=?
               WHERE id=?""",
            (
                stat.st_mtime_ns,
                stat.st_size,
                new_offset,
                line_count + len(lines),
                json.dumps(pending[-20:], ensure_ascii=False),
                utc_now_iso(),
                tid,
            ),
        )
    return True


def reconcile(force=False, db_path=None):
    """Reconcile every transcript. Returns (changed_files, scanned_files)."""
    conn = connect(db_path)
    changed = scanned = 0
    try:
        root = config.projects_dir()
        if root.exists():
            for p in sorted(root.rglob("*.jsonl")):
                scanned += 1
                try:
                    if reconcile_file(conn, p, force=force):
                        changed += 1
                except Exception:  # noqa: BLE001 -- one bad file must not stop the rest
                    log.exception("Failed to reconcile %s", p)
        if changed:
            conn.execute(
                "INSERT INTO meta(key,value) VALUES('last_reconcile',?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (utc_now_iso(),),
            )
    finally:
        conn.close()
    return changed, scanned


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    changed, scanned = reconcile(force=config.force_reconcile())
    print(f"Reconciled {changed} of {scanned} transcript(s) into {config.db_path()}")


if __name__ == "__main__":
    main()
