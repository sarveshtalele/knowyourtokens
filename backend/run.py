"""Development server: `python run.py` (auto-reload, 127.0.0.1 only)."""

import os
import sys
from pathlib import Path

import uvicorn


def env(name, default):
    # KNOWYOURTOKENS_* with the pre-rename TOKENTELEMETRY_* spelling as a fallback
    return os.environ.get(f"KNOWYOURTOKENS_{name}") or os.environ.get(f"TOKENTELEMETRY_{name}") or default


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    uvicorn.run(
        "app.main:app",
        host=env("HOST", "127.0.0.1"),
        port=int(env("BACKEND_PORT", "8000")),
        reload=True,
    )
