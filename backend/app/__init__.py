"""Know Your Tokens API package.

telemetry/ (the canonical schema/collector/reconcile package) sits next to
backend/ -- in the repo and under the CLI's install root. Putting its parent
on sys.path here, in the package __init__, guarantees it runs before any
module in this package imports ``telemetry``."""

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if (_ROOT / "telemetry").is_dir() and str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
