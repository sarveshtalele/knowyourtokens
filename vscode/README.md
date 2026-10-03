# Know Your Tokens for VS Code

See every token your AI coding agents use without leaving the editor: Claude Code, Codex CLI,
Gemini CLI, OpenCode and any agent that pushes usage to the API.

- **Status bar:** today's tokens at a glance (or the last 7 days, or all time). Click to open the
  dashboard.
- **Sidebar views** in the Know Your Tokens activity-bar icon:
  - **Overview:** today, the last 7 days, all time, cache share, top model, top agent.
  - **Projects:** every project ranked by tokens.
  - **Sessions:** recent sessions with their agent, model and tokens.
  - **Recent requests:** every model call with its exact tokens; big ones are flagged 🔥. Hover for
    the breakdown and prompt preview, click to open it in the dashboard.
- **Dashboard tab:** the full Know Your Tokens dashboard in an editor tab, including the prompt
  debugger, tools, MCP servers, the token calculator and exports.
- **Commands** (Command Palette → "Know Your Tokens"): Start, Stop, Install or Update, Run
  Diagnostics, Open Dashboard, Open Dashboard in Browser, Refresh.

Everything stays on your machine: the extension only talks to the Know Your Tokens app on
`127.0.0.1`.

## Getting started

The extension needs the Know Your Tokens app, which it can install for you:

1. Open the **Know Your Tokens** view in the activity bar.
2. Click **Install**. A terminal runs `npx knowyourtokens@latest`. If
   [uv](https://docs.astral.sh/uv/) isn't installed, it asks before installing it. uv also brings its
   own Python, so you don't need Python installed.
3. The views fill in as soon as the app is running. Next time, click **Start** (or enable autostart
   with `npx knowyourtokens autostart enable`).

**Prerequisite:** [Node.js 18+](https://nodejs.org) (for `npx`).

## Settings

| Setting | Default | What it does |
|---|---|---|
| `knowyourtokens.statusBar` | `today` | `today`, `7d`, `all`, or `off` |
| `knowyourtokens.refreshInterval` | `30` | Seconds between refreshes |
| `knowyourtokens.requestCount` | `50` | How many recent requests and sessions to list |
| `knowyourtokens.cliCommand` | `npx knowyourtokens@latest` | How to run the CLI (e.g. `knowyourtokens` if installed globally) |
| `knowyourtokens.backendPort` / `dashboardPort` | `0` (automatic) | Ports. Automatic follows `KNOWYOURTOKENS_*_PORT`, then the port the app picked when the default was taken, then 8000 / 5173 |

## Troubleshooting

- **"Tokens: offline" in the status bar:** the app isn't running. Click it to start it, or run
  **Know Your Tokens: Run Diagnostics**.
- **The dashboard tab is blank:** update the app (**Install or Update**). Versions before 2.4 don't
  allow being shown inside VS Code.
- **Remote / WSL / Codespaces:** the app runs where your agents run. Install it there; the extension
  forwards the dashboard automatically.

More help: [troubleshooting guide](https://sarveshtalele.github.io/knowyourtokens/#troubleshooting).

## License

Apache 2.0. Created by [Sarvesh Talele](https://github.com/sarveshtalele); see NOTICE.
Know Your Tokens is an independent project, not affiliated with Anthropic, OpenAI, Google, Microsoft
or any agent vendor.
