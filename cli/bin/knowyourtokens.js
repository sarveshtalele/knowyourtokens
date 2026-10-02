#!/usr/bin/env node
const { install, uninstall } = require('../src/install');
const { start, stop, status } = require('../src/run');
const { doctor } = require('../src/doctor');
const autostart = require('../src/autostart');
const paths = require('../src/paths');
const shortcut = require('../src/shortcut');

const HELP = `knowyourtokens ${paths.version()} -- local-first token observability for AI coding agents
(Claude Code, Codex CLI, Gemini CLI, OpenCode, and any agent via the ingest API)

Usage:
  knowyourtokens                    Install (if needed) and start everything
  knowyourtokens install            Copy app files, set up the Python env, wire Claude Code hooks
  knowyourtokens start              Start the backend, telemetry daemon, and dashboard
  knowyourtokens stop               Stop everything started by "start"
  knowyourtokens status             Show what's running and health checks
  knowyourtokens doctor             Diagnose the install and suggest fixes
  knowyourtokens autostart enable   Start automatically at login (Task Scheduler / launchd / systemd)
  knowyourtokens autostart disable  Remove the autostart entry
  knowyourtokens autostart status   Show whether autostart is enabled
  knowyourtokens shortcut           Add an app icon (Start Menu/Desktop, ~/Applications, app launcher)
      --dock                        ...macOS: also add it to the Dock
      --remove                      ...remove the app icon again
  knowyourtokens uninstall          Remove the Claude Code hooks (keeps app files and data)
      --purge                       ...also stop services, disable autostart, delete app files
      --delete-data                 ...also delete the telemetry database
  knowyourtokens --version          Print the version

  kyt is a short alias: kyt start, kyt doctor, ...

Environment:
  KNOWYOURTOKENS_HOME            Install directory (default: ~/.knowyourtokens)
  KNOWYOURTOKENS_BACKEND_PORT    API port (default: 8000)
  KNOWYOURTOKENS_DASHBOARD_PORT  Dashboard port (default: 5173)
  CLAUDE_CONFIG_DIR              Claude Code config directory (default: ~/.claude)
  CLAUDE_TELEMETRY_DB            Database path (default: ~/.claude/telemetry/telemetry.db)
  KNOWYOURTOKENS_NO_OPEN         Set to skip opening the browser on start
  (TOKENTELEMETRY_* names from before the rename still work.)

Docs: https://sarveshtalele.github.io/knowyourtokens/
`;

async function main() {
  const [, , cmdArg, subArg, ...rest] = process.argv;
  const flags = new Set([subArg, ...rest].filter(Boolean));

  switch (cmdArg || 'default') {
    case 'install':
      install();
      break;
    case 'start':
      await start();
      break;
    case 'stop':
      stop();
      break;
    case 'status':
      await status();
      break;
    case 'doctor':
      await doctor();
      break;
    case 'autostart':
      switch (subArg) {
        case 'enable':
          autostart.enable();
          console.log('Autostart enabled -- the dashboard will start automatically at login.');
          break;
        case 'disable':
          autostart.disable();
          console.log('Autostart disabled.');
          break;
        case 'status':
          console.log(autostart.isEnabled() ? 'Autostart is enabled.' : 'Autostart is not enabled.');
          break;
        default:
          console.error('Usage: knowyourtokens autostart <enable|disable|status>');
          process.exitCode = 1;
      }
      break;
    case 'shortcut': {
      if (flags.has('--remove')) {
        const removed = shortcut.remove();
        console.log(removed.length ? `Removed:\n  ${removed.join('\n  ')}` : 'No app shortcuts found.');
        break;
      }
      const { created, pin } = shortcut.create({ dock: flags.has('--dock') });
      console.log(`Created the ${'Know Your Tokens'} app icon:\n  ${created.join('\n  ')}`);
      console.log(`\nTo pin it: ${pin}`);
      console.log('Prefer a browser app window? Open the dashboard and click "Install app" in the top bar.');
      break;
    }
    case 'uninstall':
      uninstall({ purge: flags.has('--purge') || flags.has('--delete-data'), deleteDb: flags.has('--delete-data') });
      break;
    case 'default':
      install();
      await start();
      break;
    case '-v':
    case '--version':
    case 'version':
      console.log(paths.version());
      break;
    case '-h':
    case '--help':
    case 'help':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${cmdArg}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
});
