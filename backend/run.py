"""Development server: `python run.py` (auto-reload, 127.0.0.1 only)."""

import os
import sys
from pathlib import Path

import uvicorn

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("TOKENTELEMETRY_HOST", "127.0.0.1"),
        port=int(os.environ.get("TOKENTELEMETRY_BACKEND_PORT", "8000")),
        reload=True,
    )
