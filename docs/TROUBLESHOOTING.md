# Troubleshooting

Fixes for the problems people actually hit, organised by symptom. Installation steps are in
[INSTALLATION.md](INSTALLATION.md).

## Contents

1. [Start here: doctor and logs](#start-here-doctor-and-logs)
2. [Installing uv fails, or "uv is not installed"](#installing-uv-fails-or-uv-is-not-installed)
3. ["Python 3.10+ not found"](#python-310-not-found)
4. [Windows: the backend never connects](#windows-the-backend-never-connects)
5. [Port already in use](#port-already-in-use)
6. [Dashboard says it can't reach the backend](#dashboard-says-it-cant-reach-the-backend)
7. [Permission denied (EACCES / EPERM / EBUSY)](#permission-denied-eacces--eperm--ebusy)
8. [`knowyourtokens` command not found](#knowyourtokens-command-not-found)
9. [No data shows up](#no-data-shows-up)
10. [Linux: autostart can't reach the session bus](#linux-autostart-cant-reach-the-session-bus)
11. [VS Code extension shows "offline"](#vs-code-extension-shows-offline)
12. [Still stuck](#still-stuck)

## Start here: doctor and logs

```bash
npx knowyourtokens doctor
```

`doctor` checks Node, uv/Python, the app files, the database, hooks, ports (including Windows
reserved ranges) and running services, and prints a fix next to anything wrong.

| What | Where |
|---|---|
| Service logs | `~/.knowyourtokens/logs/backend.log`, `daemon.log`, `frontend.log`, `autostart.log` |
| Hook errors | `~/.knowyourtokens/data/hook-errors.log` |
| Ports in use | `~/.knowyourtokens/ports.json` (written when a default port was busy) |
| Full stack traces | run any command with `KNOWYOURTOKENS_DEBUG=1` |

On Windows, `~` is `%USERPROFILE%` (for example `C:\Users\you`).

## Installing uv fails, or "uv is not installed"

The backend runs on Python. The installer uses [uv](https://docs.astral.sh/uv/) to create its
private environment, and uv downloads a suitable Python itself. If uv is missing you're asked
before anything is installed.

- **You answered no, or the shell isn't interactive (CI).** Re-run with `--yes` to install uv
  without asking, or install it yourself:

  ```powershell
  # Windows (PowerShell)
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  # or
  winget install astral-sh.uv
  ```

  ```bash
  # macOS / Linux
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # or
  brew install uv        # macOS
  pipx install uv        # anywhere with pipx
  ```

  Then **open a new terminal** so `uv` is on `PATH`, and re-run `npx knowyourtokens`.
- **The download fails.** Usually a proxy or firewall. Set `HTTPS_PROXY` (and `HTTP_PROXY`) to your
  proxy before running the installer. Corporate networks that block `astral.sh` or
  `github.com` downloads: install uv from your package manager instead, or use `--no-uv` with an
  existing Python 3.10+.
- **uv is installed but not found.** The installer also looks in `~/.local/bin`, `~/.cargo/bin`,
  `$UV_INSTALL_DIR` and `$XDG_BIN_HOME`. If yours is elsewhere, add it to `PATH`.
- **"Creating the Python environment failed".** uv couldn't download Python or the packages. Check
  the network as above, then re-run. Delete `~/.knowyourtokens/.venv` first if a previous attempt
  was interrupted.

## "Python 3.10+ not found"

Only happens with `--no-uv` (or when you declined uv). Install Python 3.10 or newer
(`winget install Python.Python.3.12`, `brew install python@3.12`, your distro's package, or
[python.org](https://www.python.org/downloads/)), make sure `python3 --version` (Windows:
`py -3 --version`) works in a new terminal, and re-run. Or drop `--no-uv` and let uv handle it.

## Windows: the backend never connects

Symptoms: `start` waits and then reports the backend didn't come up, the dashboard shows
"Can't reach the backend", or the log says `WinError 10013` / "An attempt was made to access a
socket in a way forbidden by its access permissions".

1. **Reserved ports.** Hyper-V, WSL2 and Docker Desktop reserve TCP port ranges at boot, often
   including 8000. List them:

   ```powershell
   netsh interface ipv4 show excludedportrange protocol=tcp
   ```

   `start` detects a reserved or busy port, moves to the next free one and saves it to
   `ports.json`, so this normally fixes itself. To choose a port yourself:

   ```powershell
   $env:KNOWYOURTOKENS_BACKEND_PORT = 8123
   npx knowyourtokens start
   ```

   Setting the variable pins the port (no automatic fallback). To make it permanent:
   `setx KNOWYOURTOKENS_BACKEND_PORT 8123`, then open a new terminal.
2. **Slow first start.** The first start compiles Python files and antivirus scans each one.
   `start` waits up to 2 minutes on Windows and prints progress every 10 seconds. If it still times
   out, exclude `%USERPROFILE%\.knowyourtokens` from real-time scanning (Windows Security → Virus &
   threat protection → Exclusions) and run `npx knowyourtokens start` again.
3. **Firewall.** If Windows Defender Firewall asked about Python and you clicked Cancel, allow
   `python.exe` from `%USERPROFILE%\.knowyourtokens\.venv\Scripts` on *private* networks. Everything
   binds to 127.0.0.1, so nothing is exposed.
4. **VPN or proxy.** Some VPN clients and proxy settings intercept localhost traffic. Add
   `localhost,127.0.0.1` to `NO_PROXY` and to your system proxy bypass list.

Then check `~/.knowyourtokens/logs/backend.log`: `start` and `doctor` recognise the common errors
there and say which of the above applies.

## Port already in use

`EADDRINUSE`, "address already in use", or `WinError 10048`. Usually an earlier copy is still
running:

```bash
npx knowyourtokens status
npx knowyourtokens stop
npx knowyourtokens start
```

If another program owns the port, `start` moves to a free one automatically (unless you pinned the
port with `KNOWYOURTOKENS_BACKEND_PORT` / `KNOWYOURTOKENS_DASHBOARD_PORT`). To see who has it:
`lsof -i :8000` (macOS/Linux) or `netstat -ano | findstr :8000` (Windows).

## Dashboard says it can't reach the backend

The dashboard loaded but the API isn't answering.

1. `npx knowyourtokens status`: is the backend running and healthy?
2. If not, `npx knowyourtokens start` and read what it prints.
3. If it is running, a proxy may be intercepting `127.0.0.1`: set `NO_PROXY=localhost,127.0.0.1`.
4. Look at the last lines of `~/.knowyourtokens/logs/backend.log`.

## Permission denied (EACCES / EPERM / EBUSY)

- Don't run the installer with `sudo` or as Administrator; it installs into your home folder.
  If an earlier `sudo` run left root-owned files, fix them with
  `sudo chown -R "$USER" ~/.knowyourtokens ~/.npm`.
- **Windows:** a file is locked. Close terminals, editors and the dashboard window that might hold
  files in `~/.knowyourtokens`, run `npx knowyourtokens stop`, pause OneDrive sync or antivirus for
  that folder, and re-run.
- `npm install -g` failing with EACCES on macOS/Linux: use `npx knowyourtokens` instead, or
  [configure npm to install globals in your home folder](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

## `knowyourtokens` command not found

After `npm install -g`, the global npm bin folder isn't on `PATH`. Open a new terminal first
(Windows needs this). Otherwise run `npm config get prefix` and add `<prefix>/bin` (macOS/Linux)
or `<prefix>` (Windows) to `PATH`. `npx knowyourtokens …` always works without a global install.

## No data shows up

- Use your agent once after installing, then refresh. History already on disk is backfilled on the
  first start.
- Exact token counts come from the collector, which reads agent logs every few seconds while
  `start` is running. Click **Reconcile now** on the Settings page for an immediate pass.
- `doctor` shows whether the Claude Code hooks are installed; re-running
  `npx knowyourtokens install` re-adds them safely.
- If `KNOWYOURTOKENS_SOURCES` is set, make sure it includes your agent. Agent log locations are
  listed in [INSTALLATION.md](INSTALLATION.md#which-agents-are-picked-up).
- **Codex sessions missing:** older rollouts are compressed (`.jsonl.zst`) and need Python 3.14+ or
  `zstandard` in the app environment:
  `uv pip install -p ~/.knowyourtokens/.venv/bin/python zstandard`.

## Linux: autostart can't reach the session bus

Minimal or headless systems may not run a per-user systemd instance. The unit is still written to
`~/.config/systemd/user/knowyourtokens.service`. Once a user session exists (log in to a desktop, or
`loginctl enable-linger $USER` on a server), run
`systemctl --user enable --now knowyourtokens.service`.

## VS Code extension shows "offline"

The extension reads the local app, so the app has to be running. Click **Start** in the Know Your
Tokens sidebar (or run **Know Your Tokens: Start** from the Command Palette); it runs the CLI in a
terminal where any error is shown. If the app runs on non-default ports, the extension picks them up
from `ports.json` automatically, or set `knowyourtokens.backendPort` / `knowyourtokens.dashboardPort`
in settings. If the CLI isn't found, set `knowyourtokens.cliCommand` (default
`npx knowyourtokens@latest`).

## Still stuck

[Open an issue](https://github.com/sarveshtalele/knowyourtokens/issues/new/choose) with your OS,
`npx knowyourtokens --version`, the output of `npx knowyourtokens doctor`, and the relevant log lines
(no prompt content needed).
