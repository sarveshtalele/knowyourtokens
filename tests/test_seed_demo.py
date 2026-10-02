import importlib.util
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_seed_demo_builds_a_complete_fictional_dataset(env):
    spec = importlib.util.spec_from_file_location("seed_demo", ROOT / "scripts" / "seed_demo.py")
    seed = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed)

    out = env / "demo"
    seed.main(["--out", str(out), "--days", "3", "--seed", "1"])

    conn = sqlite3.connect(out / "telemetry.db")
    requests, total = conn.execute("SELECT COUNT(*), SUM(total_tokens) FROM usage").fetchone()
    assert requests > 0 and total > 0
    assert conn.execute("SELECT COUNT(*) FROM tool_calls").fetchone()[0] > 0
    projects = {r[0] for r in conn.execute("SELECT name FROM projects")}
    assert projects <= set(seed.PROJECTS)
