"""Generate a realistic, entirely fictional dataset for demos and screenshots.

Writes synthetic Claude Code transcripts into a throwaway config dir and runs
the real ingest pipeline over them, so every page of the dashboard has data
without exposing anyone's real prompts.

    python scripts/seed_demo.py --out /tmp/tt-demo
    CLAUDE_TELEMETRY_DB=/tmp/tt-demo/telemetry.db uvicorn app.main:app --app-dir backend

Deterministic: the same --seed and --days give the same data (anchored to today).
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PROJECTS = {
    "checkout-service": (0.32, ["src/payments/ledger.ts", "src/cart/giftCard.ts", "logs/checkout.log", "README.md"]),
    "web-app": (0.26, ["src/components/Cart.tsx", "src/hooks/useAuth.ts", "package-lock.json", "src/App.tsx"]),
    "infra": (0.16, ["terraform/main.tf", "k8s/deploy.yaml", "scripts/rollout.sh"]),
    "docs-site": (0.14, ["docs/getting-started.md", "docs/api.md", "astro.config.mjs"]),
    "ml-pipeline": (0.12, ["pipeline/train.py", "pipeline/features.py", "notebooks/eval.ipynb"]),
}
MODELS = [("claude-opus-4-5", 0.35), ("claude-sonnet-4-5", 0.5), ("claude-haiku-4-5", 0.15)]
ENTRYPOINTS = [("cli", 0.45), ("claude-vscode", 0.3), ("claude-jetbrains", 0.1), ("sdk-py", 0.08), ("remote", 0.07)]
PROMPTS = [
    "Why does checkout fail when the cart has a gift card?",
    "Add a loading skeleton to the cart page",
    "Write tests for the refund flow",
    "Refactor the auth hook to use the new session API",
    "Explain what this Terraform plan will change",
    "Bump the rollout to 25% and watch the error rate",
    "Fix the flaky integration test in CI",
    "Summarise the open TODOs in this package",
    "Update the API docs for the v2 endpoints",
    "Speed up feature extraction, it takes 40 minutes",
]
MCP_TOOLS = [
    "mcp__github__create_pull_request",
    "mcp__github__get_issue",
    "mcp__linear__list_issues",
    "mcp__sentry__get_event",
]
SKILLS = [("review-kit:code-review", 0.4), ("superpowers:brainstorming", 0.3), ("release-notes", 0.3)]


def pick(rng, weighted):
    r, acc = rng.random(), 0.0
    for item, w in weighted:
        acc += w
        if r <= acc:
            return item
    return weighted[-1][0]


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


LOG_LEVELS = ["INFO", "INFO", "INFO", "DEBUG", "WARN", "ERROR"]
LOG_EVENTS = [
    "cart.price recalculated items=3 total=84.20",
    "payment.authorize provider=stripe status=ok",
    "giftcard.apply code=GC-****-1192 balance=25.00",
    "giftcard.apply failed: balance currency mismatch (EUR != USD)",
    "order.create id=ord_{n} retries=0",
    "http GET /api/cart 200 41ms",
]


def fake_output(rng, block, lines):
    """Plausible, made-up tool output: log lines for Bash, code for Read/Edit."""
    name = block["name"]
    if name == "Bash":
        return "\n".join(
            f"2026-09-{rng.randint(1, 28):02d}T{rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}:{rng.randint(0, 59):02d}Z "
            f"{rng.choice(LOG_LEVELS):5} {rng.choice(LOG_EVENTS).format(n=rng.randint(1000, 9999))}"
            for _ in range(lines)
        )
    if name in ("Read", "Edit"):
        return "\n".join(
            f"{i + 1:4}\t"
            + rng.choice(
                [
                    "export function applyGiftCard(cart, card) {",
                    "  if (!card.active) return cart;",
                    "  const total = cart.items.reduce((s, i) => s + i.price, 0);",
                    "  return { ...cart, total };",
                    "}",
                    "",
                    "// TODO: handle multi-currency cards",
                ]
            )
            for i in range(lines)
        )
    if name == "Grep":
        return "\n".join(f"src/cart/file{i}.ts:{rng.randint(1, 300)}: // TODO tidy up" for i in range(lines))
    return json.dumps({"ok": True, "items": lines})


def tool_block(rng, files, n):
    kind = rng.random()
    if kind < 0.35:
        return {"type": "tool_use", "id": f"toolu_{n}", "name": "Read", "input": {"file_path": rng.choice(files)}}
    if kind < 0.55:
        return {"type": "tool_use", "id": f"toolu_{n}", "name": "Edit", "input": {"file_path": rng.choice(files)}}
    if kind < 0.72:
        return {"type": "tool_use", "id": f"toolu_{n}", "name": "Bash", "input": {"command": "npm test -- --silent"}}
    if kind < 0.82:
        return {"type": "tool_use", "id": f"toolu_{n}", "name": "Grep", "input": {"pattern": "TODO", "path": "src"}}
    if kind < 0.94:
        return {"type": "tool_use", "id": f"toolu_{n}", "name": rng.choice(MCP_TOOLS), "input": {"query": "demo"}}
    return {"type": "tool_use", "id": f"toolu_{n}", "name": "Skill", "input": {"skill": pick(rng, SKILLS)}}


def session_lines(rng, sid, cwd, files, start, entry, counter):
    model = pick(rng, MODELS)
    t = start
    lines = []
    base = {"sessionId": sid, "cwd": cwd, "entrypoint": entry, "version": "2.1.0"}
    for _turn in range(rng.randint(2, 7)):
        lines.append(
            {**base, "type": "user", "timestamp": iso(t), "message": {"role": "user", "content": rng.choice(PROMPTS)}}
        )
        for _step in range(rng.randint(1, 5)):
            t += timedelta(seconds=rng.randint(4, 90))
            counter[0] += 1
            n = counter[0]
            blocks = [{"type": "text", "text": "Looking at the relevant files now."}]
            if rng.random() < 0.75:
                blocks.append(tool_block(rng, files, n))
            heavy = rng.random() < 0.04  # the occasional 300K-token request worth debugging
            fresh = rng.randint(40_000, 180_000) if heavy else rng.randint(200, 6_000)
            usage = {
                "input_tokens": rng.randint(2, 40),
                "cache_creation_input_tokens": fresh,
                "cache_read_input_tokens": rng.randint(12_000, 140_000),
                "output_tokens": rng.randint(80, 4_000),
            }
            msg = {"id": f"msg_{n:06d}", "role": "assistant", "model": model, "content": blocks, "usage": usage}
            lines.append(
                {**base, "type": "assistant", "timestamp": iso(t), "requestId": f"req_{n:06d}", "message": msg}
            )
            for b in blocks:
                if b["type"] == "tool_use":
                    result = fake_output(rng, b, rng.randint(4, 30) * (40 if heavy else 1))
                    lines.append(
                        {
                            **base,
                            "type": "user",
                            "timestamp": iso(t + timedelta(seconds=1)),
                            "message": {
                                "role": "user",
                                "content": [{"type": "tool_result", "tool_use_id": b["id"], "content": result}],
                            },
                        }
                    )
        t += timedelta(minutes=rng.randint(1, 20))
    return lines


def generate(out: Path, days: int, seed: int) -> Path:
    rng = random.Random(seed)
    claude = out / "claude"
    projects_dir = claude / "projects"
    projects_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    counter = [0]
    for d in range(days, -1, -1):
        day = today - timedelta(days=d)
        weekend = day.weekday() >= 5
        growth = 0.5 + (days - d) / days  # usage grows over the month
        for _ in range(max(1, int(rng.randint(2, 6) * growth * (0.4 if weekend else 1)))):
            name = pick(rng, [(p, w) for p, (w, _f) in PROJECTS.items()])
            cwd = f"/home/demo/code/{name}"
            sid = f"{rng.getrandbits(64):016x}-demo"
            start = day + timedelta(hours=rng.randint(8, 19), minutes=rng.randint(0, 59))
            if start > datetime.now(timezone.utc):
                start = datetime.now(timezone.utc) - timedelta(minutes=rng.randint(5, 120))
            lines = session_lines(rng, sid, cwd, PROJECTS[name][1], start, pick(rng, ENTRYPOINTS), counter)
            folder = projects_dir / ("-home-demo-code-" + name)
            folder.mkdir(exist_ok=True)
            (folder / f"{sid}.jsonl").write_text("\n".join(json.dumps(x) for x in lines) + "\n", encoding="utf-8")
    return claude


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=Path, required=True, help="directory for the fake config dir and database")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args(argv)

    db = args.out / "telemetry.db"
    if db.exists():
        sys.exit(f"{db} already exists; pick an empty --out")
    claude = generate(args.out, args.days, args.seed)
    os.environ["CLAUDE_CONFIG_DIR"] = str(claude)
    os.environ["CLAUDE_TELEMETRY_DB"] = str(db)

    from telemetry.reconcile import reconcile

    changed, scanned = reconcile(db_path=db)
    print(f"Seeded {changed}/{scanned} demo transcripts into {db}")
    print(f"Run: CLAUDE_TELEMETRY_DB={db} python -m uvicorn app.main:app --app-dir backend --port 8000")


if __name__ == "__main__":
    main()
