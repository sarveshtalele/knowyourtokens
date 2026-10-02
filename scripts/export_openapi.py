"""Write the API's OpenAPI document to docs/openapi.json.

python scripts/export_openapi.py          # regenerate
python scripts/export_openapi.py --check  # CI: fail if the committed file is stale
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app  # noqa: E402

TARGET = ROOT / "docs" / "openapi.json"


def main():
    spec = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
    if "--check" in sys.argv:
        if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != spec:
            print("docs/openapi.json is out of date: run `python scripts/export_openapi.py`", file=sys.stderr)
            return 1
        print("docs/openapi.json is up to date")
        return 0
    TARGET.write_text(spec, encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
