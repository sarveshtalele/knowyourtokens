# Product Hunt launch kit

Everything needed to submit Know Your Tokens at <https://www.producthunt.com/posts/new>. All images use
fictional demo data (`python scripts/seed_demo.py`), so they contain no real prompts.

## Listing

| Field | Value |
|---|---|
| Name | Know Your Tokens |
| Tagline (≤ 60) | Every AI coding agent, every token, one local dashboard |
| Website | https://sarveshtalele.github.io/knowyourtokens/ |
| Source | https://github.com/sarveshtalele/knowyourtokens |
| Pricing | Free (MIT, open source) |
| Topics | Developer Tools · Artificial Intelligence · Open Source · Analytics |
| Thumbnail | [`thumbnail-240.png`](thumbnail-240.png) (240×240) |
| Social / LinkedIn | [`social-preview-1280x640.png`](social-preview-1280x640.png) · [`linkedin-1200x627.png`](linkedin-1200x627.png) · [`linkedin-portrait-1080x1350.png`](linkedin-portrait-1080x1350.png) |
| Reel (9:16) | [`video/launch-reel-1080x1920.mp4`](video/launch-reel-1080x1920.mp4) — 36.5 s with narration, original music and sound effects; captions in [`launch-reel.en.srt`](video/launch-reel.en.srt) |
| YouTube (16:9) | [`video/youtube-launch-and-guide-1920x1080.mp4`](video/youtube-launch-and-guide-1920x1080.mp4) — 2:35 narrated launch + how-to guide recorded from the real app, with original music; upload [`youtube-launch-and-guide.en.srt`](video/youtube-launch-and-guide.en.srt) as English captions; thumbnail [`youtube-thumbnail-1280x720.png`](youtube-thumbnail-1280x720.png); sources in [`src/`](src) |
| Gallery | [`gallery/`](gallery) (1270×760, in order 01 → 07) |

**Description (≤ 260 characters)**

> Local-first token observability for Claude Code, Codex, Gemini CLI, OpenCode and any agent via API.
> Exact tokens per request, debug the prompt behind any spike, compare agents. Free, open source:
> npx knowyourtokens

### Gallery captions

1. **Every token. Accounted for.** One command installs it; nothing leaves your machine.
2. **Every agent in one place.** Claude Code, Codex, Gemini CLI, OpenCode, side by side, all time.
3. **Debug a prompt.** Open any request to see its full context and exactly where the tokens went.
4. **Find the hotspots.** See which files and tools fill your context window.
5. **Know your toolbox.** Call counts for every tool, MCP server, skill and plugin.
6. **Take it anywhere.** REST + OpenAPI, Python/TS SDKs, OpenTelemetry, signed webhooks.
7. **Token calculator.** Estimate a prompt, check it fits the window, price real usage at your rates.

## Maker's first comment

> Hey Product Hunt 👋
>
> I code with several AI agents every day (Claude Code, Codex, Gemini CLI) and kept asking the same
> questions: *which project is eating my tokens? Why did that one request cost 300K? Which agent is
> cheaper for this job? Is this MCP server even worth having on?* Every agent records the answers in its
> own logs, but nothing showed them to me across all my projects and agents.
>
> So I built **Know Your Tokens**. Run `npx knowyourtokens` and it:
>
> - reads Claude Code, Codex CLI, Gemini CLI and OpenCode logs for **exact** usage (each request
>   counted once), and takes anything else (Antigravity, Cursor, your own agent) through one API call,
> - gives you one dashboard by agent, project, session, model, IDE, tool, skill and MCP server,
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
> *(Independent project, not affiliated with Anthropic, OpenAI, Google or any agent vendor.)*

## Short posts

**X / Bluesky / Threads**

> Shipped Know Your Tokens on Product Hunt today 🚀
> One local dashboard for every AI coding agent: Claude Code, Codex, Gemini CLI, OpenCode and anything
> else via API. Debug the prompt behind any spike. 100% local, MIT.
> `npx knowyourtokens`
> [PH link]

**LinkedIn / dev.to opener**

> Your coding agent tells you a session got expensive. It doesn't tell you *why*, and it never compares
> itself with the other agents you use. Know Your Tokens is a free, local dashboard that does: exact
> tokens per request for Claude Code, Codex, Gemini CLI, OpenCode and anything you push, the full
> context behind each request, and which tools, skills and MCP servers drive your usage.

## Launch checklist

**Before (a week out)**

- [ ] Repo About: description, website and topics set (see [GITHUB_SETUP.md](../GITHUB_SETUP.md)).
- [ ] Social preview image uploaded: Settings → General → Social preview → `site/public/og.png`.
- [ ] `knowyourtokens` and `knowyourtokens-client` on npm at the release version; `npx knowyourtokens`
      works on a clean machine (Windows, macOS, Linux).
- [ ] GitHub release published with notes from the CHANGELOG.
- [ ] Website deployed; the Google Search Console property (URL prefix
      `https://sarveshtalele.github.io/knowyourtokens/`) is verified and `sitemap.xml` is submitted.
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
