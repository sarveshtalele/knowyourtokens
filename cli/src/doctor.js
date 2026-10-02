// `tokentelemetry doctor`: checks every moving part and says how to fix it.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const paths = require('./paths');
const hooks = require('./hooks');
const { httpOk } = require('./run');

function check(ok, label, fix) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${label}${!ok && fix ? `\n      -> ${fix}` : ''}`);
  return ok;
}

async function doctor() {
  let healthy = true;
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  healthy &= check(nodeMajor >= 18, `Node.js ${process.versions.node} (need >= 18)`, 'Install Node.js 18 or newer.');

  const installed = fs.existsSync(paths.venvPython());
  healthy &= check(installed, `Python environment at ${paths.venvDir()}`, 'Run "tokentelemetry install".');
  if (installed) {
    const res = spawnSync(paths.venvPython(), ['-c', 'import sys, fastapi; print(sys.version.split()[0])'], {
      encoding: 'utf8',
    });
    healthy &= check(res.status === 0, `Python ${res.stdout.trim() || '?'} with backend dependencies`,
      'Run "tokentelemetry install" to reinstall dependencies.');
  }

  const versionFile = path.join(paths.installDir(), 'VERSION');
  const appVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null;
  healthy &= check(appVersion === paths.version(), `Installed app files v${appVersion || '?'} (CLI v${paths.version()})`,
    'Run "tokentelemetry install" to update the app files.');

  let events = [];
  try {
    events = hooks.installedHookEvents();
    healthy &= check(events.length === hooks.HOOK_EVENTS.length,
      `Claude Code hooks: ${events.length}/${hooks.HOOK_EVENTS.length} events wired in ${paths.claudeSettingsPath()}`,
      'Run "tokentelemetry install" to (re)wire hooks.');
  } catch (err) {
    healthy &= check(false, `Read ${paths.claudeSettingsPath()}`, err.message);
  }

  const hookLog = path.join(path.dirname(require('./install').dbPath()), 'hook-errors.log');
  const hookErrors = fs.existsSync(hookLog) && fs.statSync(hookLog).size > 0;
  check(!hookErrors, 'No hook errors logged', `See ${hookLog} (hooks never block Claude Code, but data may be missing).`);

  const backend = await httpOk(`http://127.0.0.1:${paths.backendPort()}/health`);
  healthy &= check(backend, `Backend /health on port ${paths.backendPort()}`, 'Run "tokentelemetry start", then check logs.');
  const dash = await httpOk(`http://127.0.0.1:${paths.dashboardPort()}/`);
  healthy &= check(dash, `Dashboard on port ${paths.dashboardPort()}`, 'Run "tokentelemetry start", then check logs.');

  console.log('');
  console.log(healthy ? 'Everything looks good.' : `Some checks failed. Logs: ${paths.logDir()}`);
  if (!healthy) process.exitCode = 1;
}

module.exports = { doctor };
