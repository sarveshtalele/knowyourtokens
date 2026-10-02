# Product Hunt launch kit

Everything needed to submit Token Telemetry at <https://www.producthunt.com/posts/new>. All images use
fictional demo data (`python scripts/seed_demo.py`), so they contain no real prompts.

## Listing

| Field | Value |
|---|---|
| Name | Token Telemetry |
| Tagline (≤ 60) | See where every Claude Code token goes, 100% locally |
| Website | https://sarveshtalele.github.io/tokentelemetry/ |
| Source | https://github.com/sarveshtalele/tokentelemetry |
| Pricing | Free (MIT, open source) |
| Topics | Developer Tools · Artificial Intelligence · Open Source · Analytics |
| Thumbnail | [`thumbnail-240.png`](thumbnail-240.png) (240×240) |
| Gallery | [`gallery/`](gallery) (1270×760, in order 01 → 07) |

**Description (≤ 260 characters)**

> Open-source, local-first observability for Claude Code. Exact tokens per request, project, session,
> tool, skill and MCP server. Open any request to see what filled its context. REST API, SDKs,
> OpenTelemetry. One command: npx tokentelemetry

### Gallery captions

1. **Every token. Accounted for.** One command installs it; nothing leaves your machine.
2. **All your Claude Code usage in one place.** Every project, session, model and IDE, all time.
3. **Debug a prompt.** Open any request to see its full context and exactly where the tokens went.
4. **Find the hotspots.** See which files and tools fill your context window.
5. **Know your toolbox.** Call counts for every tool, MCP server, skill and plugin.
6. **Take it anywhere.** REST + OpenAPI, Python/TS SDKs, OpenTelemetry, signed webhooks.
7. **Token calculator.** Estimate a prompt, check it fits the window, price real usage at your rates.

## Maker's first comment

> Hey Product Hunt 👋
>
> I use Claude Code every day, and kept asking the same questions: *which project is eating my tokens?
> Why did that one request cost 300K? Is this MCP server even worth having on?* Claude Code records the
> answers in its own transcripts, but nothing showed them to me across all my projects.
>
> So I built **Token Telemetry**. Run `npx tokentelemetry` and it:
>
> - wires into Claude Code's hooks and reads its transcripts for **exact** usage (each API request
>   counted once),
> - gives you a dashboard by project, session, model, IDE, tool, skill and MCP server,
> - lets you open any request and see the **full context** behind it, with likely secrets redacted,
> - has a **token calculator**: estimate a prompt before you send it and price your real usage at your
>   own rates,
> - installs as an app with its own icon, so you can pin it to your Dock or taskbar.
>
> It's **100% local**: SQLite on your machine, bound to 127.0.0.1, no account, no telemetry of its own.
> It's also **built to integrate**: a typed REST API with OpenAPI, Python and TypeScript SDKs,
> OpenTelemetry export (Grafana, Datadog, Honeycomb) and HMAC-signed webhooks.
>
> MIT licensed. I'd love feedback, issues and PRs, especially on which views you'd want next.
>
> *(Independent project, not affiliated with Anthropic.)*

## Short posts

**X / Bluesky / Threads**

> Shipped Token Telemetry on Product Hunt today 🚀
> See where every Claude Code token goes, per project, request, tool, skill and MCP server. Open any
> request to see what filled its context. 100% local, MIT.
> `npx tokentelemetry`
> [PH link]

**LinkedIn / dev.to opener**

> Claude Code tells you a session got expensive. It doesn't tell you *why*. Token Telemetry is a free,
> local dashboard that does: exact tokens per request, the full context behind each one, and which
> tools, skills and MCP servers drive your usage.

## Launch checklist

**Before (a week out)**

- [ ] Repo About: description, website and topics set (see [GITHUB_SETUP.md](../GITHUB_SETUP.md)).
- [ ] Social preview image uploaded: Settings → General → Social preview → `site/public/og.png`.
- [ ] `tokentelemetry` and `tokentelemetry-client` on npm at the release version; `npx tokentelemetry`
      works on a clean machine (Windows, macOS, Linux).
- [ ] GitHub release published with notes from the CHANGELOG.
- [ ] Website deployed; the Google Search Console property (URL prefix
      `https://sarveshtalele.github.io/tokentelemetry/`) is verified and `sitemap.xml` is submitted.
- [ ] Link previews checked: <https://www.opengraph.xyz/> on the site URL.
- [ ] A couple of `good first issue`s open, so new visitors have somewhere to start.
- [ ] Discussions enabled for questions.
- [ ] Product Hunt draft created with the assets above; scheduled for 12:01 AM PT (Tuesday to Thursday
      are busiest; a weekend gets less competition).

**Launch day**

- [ ] Post the maker comment as soon as the launch goes live.
- [ ] Share in your own channels, and ask people to try it and comment, not just upvote (PH discounts
      vote-only traffic).
- [ ] Reply to every comment within the hour; turn feature requests into issues and link them.
- [ ] Watch new issues for install problems on each OS.

**After**

- [ ] Thank-you post with what you learned; add the PH badge to the README and site if you like.
- [ ] Triage feedback into [ROADMAP.md](../../ROADMAP.md).

## Regenerating the assets

```bash
python scripts/seed_demo.py --out /tmp/tt-demo
CLAUDE_TELEMETRY_DB=/tmp/tt-demo/telemetry.db python -m uvicorn app.main:app --app-dir backend --port 8000
cd frontend && npm run build && npx vite preview --port 5173       # dashboard
cd site && npm run build && npx vite preview --port 4173            # website
```

Then capture at a 1270×760 viewport (2× device scale, downsampled) for the gallery.
