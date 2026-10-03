"""Generate docs/assets/integration-map.svg, the "how everything connects" infographic.

One self-contained, animated SVG (CSS keyframes, no scripts, no external fonts) so the same file
works in the README (GitHub serves it through <img>) and on the website. Re-run after editing the
lists below:

    python scripts/make_integration_map.py
"""

from __future__ import annotations

from html import escape
from pathlib import Path

W, H = 1600, 860
ROOT = Path(__file__).resolve().parent.parent
# The README uses docs/assets; the website serves its own copy from site/public.
OUTS = [ROOT / "docs" / "assets" / "integration-map.svg", ROOT / "site" / "public" / "integration-map.svg"]

VIOLET = "#7c6cff"
INK = "#1d1d1f"
MUTED = "#6e6e73"
LINE = "#e5e5ea"

# (group title, [(label, sublabel, colour)])
INPUTS = [
    (
        "READ AUTOMATICALLY",
        [
            ("Claude Code", "live hooks + transcripts", "#d97757"),
            ("Codex CLI", "~/.codex/sessions", "#10a37f"),
            ("Gemini CLI", "~/.gemini/tmp/*/chats", "#4285f4"),
            ("OpenCode", "its SQLite db, read-only", "#6e56f8"),
        ],
    ),
    (
        "PUSHED THROUGH THE INGEST API",
        [
            ("Antigravity", "headless runs", "#a855f7"),
            ("Cursor · Copilot CLI", "any agent with usage numbers", "#64748b"),
            ("Your own agent / CI", "POST /api/v1/ingest", "#0ea5a4"),
        ],
    ),
]
CLIENTS = ["VS Code", "JetBrains", "Terminal", "Desktop"]

OUTPUTS = [
    (
        "SEE",
        [
            ("Dashboard", "installable app, light + dark", VIOLET),
            ("Live feed", "WebSocket /ws/live", VIOLET),
            ("Token calculator", "estimate + price prompts", VIOLET),
        ],
    ),
    (
        "BUILD",
        [
            ("REST API + OpenAPI", "25 typed endpoints", "#2563eb"),
            ("Python · TypeScript SDKs", "zero dependencies", "#2563eb"),
            ("Exports", "CSV · JSON · NDJSON", "#2563eb"),
        ],
    ),
    (
        "SHIP TO (OPT-IN)",
        [
            ("OpenTelemetry (OTLP)", "Grafana · Datadog · Honeycomb", "#059669"),
            ("Webhooks, HMAC-signed", "Slack · n8n · Zapier · anything", "#059669"),
        ],
    ),
]

# The app icon (docs/assets/logo.svg), ids prefixed so they can't clash with the map's own.
LOGO = '<defs> <linearGradient id="map-g" gradientUnits="userSpaceOnUse" x1="12" y1="12" x2="52" y2="52"> <stop offset="0" stop-color="#8b7bff"/> <stop offset=".55" stop-color="#ec4899"/> <stop offset="1" stop-color="#2dd4bf"/> </linearGradient> <linearGradient id="map-b" gradientUnits="userSpaceOnUse" x1="0" y1="36" x2="0" y2="20"> <stop offset="0" stop-color="#8b7bff"/> <stop offset="1" stop-color="#2dd4bf"/> </linearGradient> <radialGradient id="map-bg" cx=".35" cy=".3" r=".85"> <stop offset="0" stop-color="#2a2550"/> <stop offset="1" stop-color="#0d0d16"/> </radialGradient> </defs> <rect width="64" height="64" rx="14" fill="url(#map-bg)"/> <g> <rect x="20" y="29" width="4.5" height="7" rx="1.6" fill="url(#map-b)"/> <rect x="26.5" y="24.5" width="4.5" height="11.5" rx="1.6" fill="url(#map-b)"/> <rect x="33" y="20" width="4.5" height="16" rx="1.6" fill="url(#map-b)"/> <circle cx="28.5" cy="28" r="15" fill="none" stroke="url(#map-g)" stroke-width="5"/> <path d="M39.5 39 L50 49.5" fill="none" stroke="url(#map-g)" stroke-width="7" stroke-linecap="round"/> </g>'

CORE_X, CORE_W = 640, 320
CORE_Y, CORE_H = 210, 560
CORE_MID = CORE_Y + CORE_H / 2
NODE_W, NODE_H, GAP, HEAD = 380, 50, 10, 34


def layout(groups, top):
    """Return [(kind, y, payload)] for headers and nodes, vertically centred around the core."""
    rows, y = [], top
    for title, items in groups:
        rows.append(("head", y, title))
        y += HEAD
        for it in items:
            rows.append(("node", y, it))
            y += NODE_H + GAP
        y += 18
    return rows, y


def text(x, y, s, size, fill=INK, weight=500, anchor="start", extra=""):
    return (
        f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" {extra}>{escape(s)}</text>'
    )


def node(x, y, label, sub, colour, i, side):
    delay = f"{0.15 + i * 0.07:.2f}s"
    return f"""<g class="n {side}" style="animation-delay:{delay}">
  <rect x="{x}" y="{y}" width="{NODE_W}" height="{NODE_H}" rx="14" fill="#fff" stroke="{LINE}"/>
  <circle cx="{x + 24}" cy="{y + NODE_H / 2}" r="7" fill="{colour}"/>
  {text(x + 42, y + 22, label, 16, weight=650)}
  {text(x + 42, y + 39, sub, 12.5, MUTED, 450)}
</g>"""


def wire(x1, y1, x2, y2, colour, i, cls=""):
    mx = (x1 + x2) / 2
    d = f"M{x1},{y1} C{mx},{y1} {mx},{y2} {x2},{y2}"
    delay = f"{(i * 0.23) % 1.6:.2f}s"
    return (
        f'<path d="{d}" class="w" stroke="{colour}"/>'
        f'<path d="{d}" class="f {cls}" stroke="{colour}" style="animation-delay:-{delay}"/>'
    )


def build() -> str:
    parts: list[str] = []
    in_rows, in_end = layout(INPUTS, 170)
    out_rows, _ = layout(OUTPUTS, 170)

    lx, rx = 60, W - 60 - NODE_W
    n = 0
    for kind, y, payload in in_rows:
        if kind == "head":
            parts.append(text(lx, y + 18, payload, 12.5, VIOLET, 700, extra='letter-spacing="1.6"'))
            continue
        label, sub, colour = payload
        ty = CORE_MID - 150 + n * 34
        parts.append(wire(lx + NODE_W, y + NODE_H / 2, CORE_X, ty, colour, n))
        parts.append(node(lx, y, label, sub, colour, n, "l"))
        n += 1

    # IDE / client chips under the inputs
    cy = in_end + 4
    parts.append(text(lx, cy + 18, "DETECTED FOR EVERY REQUEST", 12.5, VIOLET, 700, extra='letter-spacing="1.6"'))
    cx = lx
    for c in CLIENTS:
        w = 18 + len(c) * 8.6
        parts.append(
            f'<rect x="{cx}" y="{cy + 32}" width="{w:.0f}" height="34" rx="17" fill="#f5f5f7" stroke="{LINE}"/>'
            + text(cx + w / 2, cy + 54, c, 14, INK, 550, "middle")
        )
        cx += w + 8

    m = 0
    for kind, y, payload in out_rows:
        if kind == "head":
            parts.append(text(rx, y + 18, payload, 12.5, VIOLET, 700, extra='letter-spacing="1.6"'))
            continue
        label, sub, colour = payload
        ty = CORE_MID - 150 + m * 37
        parts.append(wire(CORE_X + CORE_W, ty, rx, y + NODE_H / 2, colour, m + 3, "out"))
        parts.append(node(rx, y, label, sub, colour, m, "r"))
        m += 1

    # Core stack
    layers = [
        ("Collector", "hooks · incremental readers · ingest"),
        ("SQLite", "~/.knowyourtokens, on your disk"),
        ("FastAPI", "127.0.0.1 only · /api/v1"),
    ]
    core = [
        f'<rect x="{CORE_X - 6}" y="{CORE_Y - 6}" width="{CORE_W + 12}" height="{CORE_H + 12}" rx="34" '
        'fill="url(#glow)" opacity=".55"/>',
        f'<rect x="{CORE_X}" y="{CORE_Y}" width="{CORE_W}" height="{CORE_H}" rx="28" fill="#fff" '
        'stroke="url(#brand)" stroke-width="2.5"/>',
        f'<svg x="{CORE_X + CORE_W / 2 - 34}" y="{CORE_Y + 34}" width="68" height="68" viewBox="0 0 64 64">'
        + LOGO
        + "</svg>",
        text(CORE_X + CORE_W / 2, CORE_Y + 140, "Know Your Tokens", 26, INK, 800, "middle", 'letter-spacing="-.5"'),
        text(
            CORE_X + CORE_W / 2,
            CORE_Y + 166,
            "npx knowyourtokens",
            14,
            VIOLET,
            600,
            "middle",
            'font-family="JetBrains Mono, ui-monospace, Menlo, monospace"',
        ),
    ]
    ly = CORE_Y + 200
    for i, (t, s) in enumerate(layers):
        core.append(
            f'<rect x="{CORE_X + 28}" y="{ly}" width="{CORE_W - 56}" height="76" rx="16" fill="#f5f5f7"/>'
            + text(CORE_X + CORE_W / 2, ly + 33, t, 18, INK, 700, "middle")
            + text(CORE_X + CORE_W / 2, ly + 55, s, 12.5, MUTED, 450, "middle")
        )
        if i < len(layers) - 1:
            ax = CORE_X + CORE_W / 2
            core.append(
                f'<path d="M{ax} {ly + 80} v14" stroke="{VIOLET}" stroke-width="2.5" class="pulse"/>'
                f'<path d="M{ax - 6} {ly + 88} l6 7 l6 -7" fill="none" stroke="{VIOLET}" stroke-width="2.5"/>'
            )
        ly += 100
    core.append(
        f'<rect x="{CORE_X + 40}" y="{CORE_Y + CORE_H - 52}" width="{CORE_W - 80}" height="30" rx="15" '
        'fill="#ecfdf5"/>'
        + text(
            CORE_X + CORE_W / 2,
            CORE_Y + CORE_H - 32,
            "100% local · no account · no cloud",
            13,
            "#047857",
            650,
            "middle",
        )
    )

    head = [
        text(W / 2, 74, "INTEGRATION MAP", 14, VIOLET, 700, "middle", 'letter-spacing="2.4"'),
        text(W / 2, 120, "Every agent in. Every tool out.", 40, INK, 800, "middle", 'letter-spacing="-1.2"'),
        f'<line x1="{W / 2 - 40}" y1="140" x2="{W / 2 + 40}" y2="140" stroke="url(#brand)" stroke-width="4" '
        'stroke-linecap="round"/>',
    ]
    foot = text(
        W / 2,
        H - 28,
        "github.com/sarveshtalele/knowyourtokens · Apache 2.0 · not affiliated with any agent vendor",
        13,
        MUTED,
        450,
        "middle",
    )

    style = """
text { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.w { fill: none; stroke-width: 2; opacity: .28; }
.f { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 3 22;
      animation: flow 1.6s linear infinite; }
.n { animation: rise .7s cubic-bezier(.16,1,.3,1) both; }
.n.l { --dx: -14px; } .n.r { --dx: 14px; }
.pulse { animation: pulse 1.6s ease-in-out infinite; }
@keyframes flow { to { stroke-dashoffset: -50; } }
@keyframes rise { from { opacity: 0; transform: translateX(var(--dx)); } }
@keyframes pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .f, .n, .pulse { animation: none; } .f { opacity: 0; } }
"""
    defs = f"""<defs>
  <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="{VIOLET}"/><stop offset=".55" stop-color="#ec4899"/>
    <stop offset="1" stop-color="#2dd4bf"/>
  </linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="{VIOLET}" stop-opacity=".35"/>
    <stop offset="1" stop-color="{VIOLET}" stop-opacity="0"/></radialGradient>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1.2" fill="#e8e8ee"/></pattern>
</defs>"""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img"
     aria-labelledby="t d">
<title id="t">Know Your Tokens integration map</title>
<desc id="d">Claude Code, Codex CLI, Gemini CLI and OpenCode are read automatically; Antigravity, Cursor,
Copilot CLI and your own agents push usage through the ingest API. Know Your Tokens collects it into a
local SQLite database behind a local API. Out come the dashboard, a live feed, the token calculator, a
REST API with OpenAPI, Python and TypeScript SDKs, CSV/JSON/NDJSON exports, and opt-in OpenTelemetry and
webhook exports to tools like Grafana, Datadog, Honeycomb, Slack and n8n.</desc>
<style>{style}</style>
{defs}
<rect width="{W}" height="{H}" rx="36" fill="#fbfbfd"/>
<rect width="{W}" height="{H}" rx="36" fill="url(#dots)"/>
{chr(10).join(head)}
{chr(10).join(parts)}
{chr(10).join(core)}
{foot}
</svg>
"""


if __name__ == "__main__":
    svg = build()
    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(svg, encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}")
