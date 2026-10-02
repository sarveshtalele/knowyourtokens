#!/usr/bin/env python3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from telemetry.collector import main  # noqa: E402 (needs sys.path set first)

if __name__ == "__main__":
    main()
