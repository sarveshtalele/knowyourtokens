"""Make the canonical ``telemetry`` package importable.

telemetry/ sits next to backend/ (in the repo, and under the CLI's install
root), and is the only schema/collector/reconcile implementation."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
