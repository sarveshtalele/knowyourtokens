// `knowyourtokens doctor`: checks every moving part and says how to fix it.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const paths = require('./paths');
const hooks = require('./hooks');
const { httpOk, portProblem } = require('./run');
const { findUv, installCommand } = require('./uv');
const { TROUBLESHOOTING_URL } = require('./errors');

function check(ok, label, fix) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${label}${!ok && fix ? `\n      -> ${fix}` : ''}`);
  return ok;
}

async function doctor() {
  let healthy = true;
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  healthy &= check(nodeMajor >= 18, `Node.js ${process.versions.node} (need >= 18)`, 'Install Node.js 18 or newer.');

  const uv = findUv();
  console.log(`INFO  uv: ${uv ? (uv === 'uv' ? 'on PATH' : uv) : `not installed (only needed to (re)install; get it with: ${installCommand()})`}`);

  const installed = fs.existsSync(paths.venvPython());
  healthy &= check(installed, `Python environment at ${paths.venvDir()}`, 'Run "knowyourtokens install".');
  if (installed) {
    const res = spawnSync(paths.venvPython(), ['-c', 'import sys, fastapi; print(sys.version.split()[0])'], {
      encoding: 'utf8',
    });
    healthy &= check(res.status === 0, `Python ${res.stdout.trim() || '?'} with backend dependencies`,
      'Run "knowyourtokens install" to reinstall dependencies.');
  }

  const versionFile = path.join(paths.installDir(), 'VERSION');
  const appVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null;
  healthy &= check(appVersion === paths.version(), `Installed app files v${appVersion || '?'} (CLI v${paths.version()})`,
    'Run "knowyourtokens install" to update the app files.');

  let events = [];
  try {
    events = hooks.installedHookEvents();
    healthy &= check(events.length === hooks.HOOK_EVENTS.length,
      `Claude Code hooks: ${events.length}/${hooks.HOOK_EVENTS.length} events wired in ${paths.claudeSettingsPath()}`,
      'Run "knowyourtokens install" to (re)wire hooks.');
  } catch (err) {
    healthy &= check(false, `Read ${paths.claudeSettingsPath()}`, err.message);
  }

  const db = paths.dbPath();
  console.log(`INFO  Your data: ${db}${fs.existsSync(db) ? '' : ' (created on first use)'}`);
  if (db === paths.legacyDbPath()) {
    console.log('      (still at the pre-2.4 location; "knowyourtokens install" moves it to the app folder)');
  }

  const hookLog = path.join(path.dirname(db), 'hook-errors.log');
  const hookErrors = fs.existsSync(hookLog) && fs.statSync(hookLog).size > 0;
  check(!hookErrors, 'No hook errors logged', `See ${hookLog} (hooks never block Claude Code, but data may be missing).`);

  const found = paths.agentDataPaths().filter((a) => fs.existsSync(a.path));
  console.log(
    `INFO  Agents found: ${found.length ? found.map((a) => a.name).join(', ') : 'none yet'}` +
      ' (any other agent can push usage to POST /api/v1/ingest)',
  );

  const portFix = async (port, envName) => {
    const problem = await portProblem(port);
    if (problem === 'EACCES') {
      return `Port ${port} is reserved by Windows (Hyper-V/WSL/Docker). "knowyourtokens start" picks a free port automatically, or set KNOWYOURTOKENS_${envName}.`;
    }
    if (problem) return `Port ${port} is used by another program. Run "knowyourtokens stop", or set KNOWYOURTOKENS_${envName}.`;
    return `Run "knowyourtokens start". If it still fails, read the logs in ${paths.logDir()}.`;
  };
  const backend = await httpOk(`http://127.0.0.1:${paths.backendPort()}/health`);
  healthy &= check(backend, `Backend /health on port ${paths.backendPort()}`, backend ? '' : await portFix(paths.backendPort(), 'BACKEND_PORT'));
  const dash = await httpOk(`http://127.0.0.1:${paths.dashboardPort()}/`);
  healthy &= check(dash, `Dashboard on port ${paths.dashboardPort()}`, dash ? '' : await portFix(paths.dashboardPort(), 'DASHBOARD_PORT'));

  console.log('');
  console.log(healthy ? 'Everything looks good.' : `Some checks failed. Logs: ${paths.logDir()}\nTroubleshooting: ${TROUBLESHOOTING_URL}`);
  if (!healthy) process.exitCode = 1;
}

module.exports = { doctor };
