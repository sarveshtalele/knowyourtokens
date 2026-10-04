const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const paths = require('./paths');
const proc = require('./process');
const { TROUBLESHOOTING_URL } = require('./errors');

// How long a service may take to answer its health check. The first backend start is the slow one:
// Python compiles the app and creates the database, and on Windows antivirus scans every new file.
const STARTUP_TIMEOUT_MS = {
  backend: process.platform === 'win32' ? 120000 : 60000,
  daemon: 5000,
  frontend: 30000,
};

// Substrings each service's command line must contain for `stop` to touch it.
const SERVICES = {
  backend: { marker: 'app.main:app', log: 'backend.log', label: 'Backend' },
  daemon: { marker: 'telemetry.daemon', log: 'daemon.log', label: 'Collector' },
  frontend: { marker: 'static-server.js', log: 'frontend.log', label: 'Dashboard' },
};

function logDir() {
  fs.mkdirSync(paths.logDir(), { recursive: true });
  return paths.logDir();
}

function logPath(name) {
  return path.join(logDir(), name);
}

function openLog(name) {
  const file = logPath(name);
  // Keep logs bounded: rotate once past 5 MB.
  try {
    if (fs.statSync(file).size > 5 * 1024 * 1024) fs.renameSync(file, `${file}.1`);
  } catch {
    /* no log yet */
  }
  return fs.openSync(file, 'a');
}

function readRunState() {
  try {
    return JSON.parse(fs.readFileSync(paths.runStatePath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeRunState(state) {
  fs.mkdirSync(paths.installDir(), { recursive: true });
  fs.writeFileSync(paths.runStatePath(), JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tailLog(name, maxChars = 600) {
  try {
    const content = fs.readFileSync(logPath(name), 'utf8');
    return content.length > maxChars ? '...' + content.slice(-maxChars) : content;
  } catch {
    return '(no log output captured)';
  }
}

function ensureInstalled() {
  if (!fs.existsSync(paths.venvPython())) {
    throw new Error('Not installed yet. Run "knowyourtokens install" first.');
  }
}

function openBrowser(url) {
  if (paths.env('NO_OPEN')) return;
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
    // No browser (headless, or autostart before a desktop session) is fine.
    child.on('error', () => {});
    child.unref();
  } catch {
    /* best effort */
  }
}

function httpOk(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      // Strict 200: something else answering on the port isn't us.
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Resolve to null when the port can be used on 127.0.0.1, else the error code (EADDRINUSE, EACCES...). */
function portProblem(port) {
  return new Promise((resolve) => {
    const srv = require('net').createServer();
    srv.once('error', (err) => resolve(err.code || 'EUNKNOWN'));
    srv.once('listening', () => srv.close(() => resolve(null)));
    srv.listen(port, '127.0.0.1');
  });
}

function portFree(port) {
  return portProblem(port).then((p) => p === null);
}

function describePortProblem(port, code) {
  if (code === 'EACCES') {
    return process.platform === 'win32'
      ? `Port ${port} is reserved by Windows (Hyper-V, WSL or Docker reserve port ranges)`
      : `Port ${port} needs elevated permissions`;
  }
  return `Port ${port} is already in use by another program`;
}

/**
 * The port to use for a service: the preferred one if it's free, otherwise (unless the user pinned it
 * with an environment variable) the next free one, remembered in ports.json for status, doctor and the
 * dashboard proxy. Returns null when nothing usable was found.
 */
async function choosePort(kind, preferred, envName) {
  const problem = await portProblem(preferred);
  if (!problem) return preferred;
  const why = describePortProblem(preferred, problem);
  if (paths.portFromEnv(envName)) {
    console.log(`${why}, and ${`KNOWYOURTOKENS_${envName}`} asks for exactly that port.`);
    console.log(`  Pick another port (e.g. set KNOWYOURTOKENS_${envName}=${preferred + 10}) and run start again.`);
    return null;
  }
  for (let candidate = preferred + 1; candidate <= preferred + 50 && candidate < 65536; candidate++) {
    if (!(await portProblem(candidate))) {
      console.log(`${why}; using port ${candidate} instead.`);
      paths.savePorts({ ...paths.savedPorts(), [kind]: candidate });
      return candidate;
    }
  }
  console.log(`${why}, and no free port was found near it. Set KNOWYOURTOKENS_${envName} to a free port.`);
  return null;
}

/** Turn the last lines of a service log into a likely cause and fix. */
function diagnose(tail, { alive = false, port } = {}) {
  const tips = [];
  if (/WinError 10013|forbidden by its access permissions/i.test(tail)) {
    tips.push(`Windows blocked port ${port}. Run "npx knowyourtokens start" again (it picks a free port), or set KNOWYOURTOKENS_BACKEND_PORT.`);
  } else if (/EADDRINUSE|address already in use|WinError 10048/i.test(tail)) {
    tips.push(`Port ${port} is taken. Run "npx knowyourtokens stop", or set KNOWYOURTOKENS_BACKEND_PORT to a free port.`);
  }
  if (/ModuleNotFoundError|No module named|ImportError/i.test(tail)) {
    tips.push('Python packages are missing or broken. Run "npx knowyourtokens install" to repair them.');
  }
  if (/database is locked/i.test(tail)) {
    tips.push('The database is locked by another process. Run "npx knowyourtokens stop", wait a few seconds, then start again.');
  }
  if (/PermissionError|Access is denied|Operation not permitted/i.test(tail)) {
    tips.push('A file was blocked. If antivirus quarantined something in the app folder, allow it, then run "npx knowyourtokens install".');
  }
  if (/SyntaxError|requires Python|is not supported/i.test(tail)) {
    tips.push('The Python environment is too old. Delete the ".venv" folder in the app folder, then run "npx knowyourtokens install".');
  }
  if (!tips.length && alive) {
    tips.push(
      'The backend is running but not answering on 127.0.0.1. A firewall, VPN or security tool may be blocking local connections: allow Python for private networks, and if you use a proxy set NO_PROXY=127.0.0.1,localhost.',
      'A very slow first start (antivirus scanning) can also cause this: run "npx knowyourtokens start" once more.',
    );
  }
  if (!tips.length) tips.push('Run "npx knowyourtokens doctor" for a full check.');
  return tips;
}

/**
 * Spawn a detached service, then wait until `ready()` passes (or the process
 * dies / times out), so `start` reports what actually happened.
 */
async function spawnAndWait(key, cmd, args, opts, ready) {
  const svc = SERVICES[key];
  const out = openLog(svc.log);
  const child = spawn(cmd, args, {
    detached: true,
    stdio: ['ignore', out, out],
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    windowsHide: true,
  });
  // A missing binary emits an async 'error'; the liveness check reports it.
  child.on('error', () => {});
  child.unref();
  const started = Date.now();
  const deadline = started + STARTUP_TIMEOUT_MS[key];
  let nextNote = started + 8000;
  while (Date.now() < deadline) {
    await sleep(300);
    if (!proc.isAlive(child.pid)) break;
    if (await ready()) return child.pid;
    if (Date.now() >= nextNote) {
      console.log(`  still starting the ${svc.label.toLowerCase()} (${Math.round((Date.now() - started) / 1000)}s; the first start is the slowest)...`);
      nextNote = Date.now() + 10000;
    }
  }
  const alive = proc.isAlive(child.pid);
  if (alive && !ready.strict) return child.pid;
  const tail = tailLog(svc.log, 1500);
  console.log('');
  console.log(
    alive
      ? `✖ The ${svc.label.toLowerCase()} started but didn't respond within ${STARTUP_TIMEOUT_MS[key] / 1000}s.`
      : `✖ The ${svc.label.toLowerCase()} stopped right after starting.`,
  );
  console.log(`  Last lines of ${logPath(svc.log)}:`);
  console.log(tail.split(/\r?\n/).map((line) => `    ${line}`).join('\n'));
  console.log('  How to fix it:');
  for (const tip of diagnose(tail, { alive, port: opts.port })) console.log(`   • ${tip}`);
  if (alive) proc.terminate(child.pid);
  return null;
}

async function start() {
  ensureInstalled();
  const state = readRunState();
  let backendPort = paths.backendPort();
  let dashboardPort = paths.dashboardPort();
  const sharedEnv = () => ({
    KNOWYOURTOKENS_BACKEND_PORT: String(backendPort),
    KNOWYOURTOKENS_DASHBOARD_PORT: String(dashboardPort),
    PYTHONUNBUFFERED: '1',
  });

  async function ensure(key, launch) {
    if (proc.isOurs(state[key], SERVICES[key].marker)) {
      console.log(`${SERVICES[key].label} already running (pid ${state[key]}).`);
      return;
    }
    delete state[key];
    const pid = await launch();
    if (pid) state[key] = pid;
    writeRunState(state);
  }

  await ensure('backend', async () => {
    const port = await choosePort('backend', backendPort, 'BACKEND_PORT');
    if (!port) return null;
    backendPort = port;
    console.log(`Starting the backend on port ${backendPort}...`);
    const pid = await spawnAndWait(
      'backend',
      paths.venvPython(),
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(backendPort), '--no-access-log'],
      { cwd: path.join(paths.installDir(), 'backend'), env: sharedEnv(), port: backendPort },
      Object.assign(() => httpOk(`http://127.0.0.1:${backendPort}/health`), { strict: true })
    );
    if (pid) console.log(`Backend started (pid ${pid}) on http://127.0.0.1:${backendPort}`);
    return pid;
  });

  await ensure('daemon', async () => {
    const pid = await spawnAndWait(
      'daemon',
      paths.venvPython(),
      ['-m', 'telemetry.daemon'],
      { cwd: paths.installDir(), env: sharedEnv() },
      async () => true
    );
    if (pid) console.log(`Collector started (pid ${pid}).`);
    return pid;
  });

  await ensure('frontend', async () => {
    const port = await choosePort('dashboard', dashboardPort, 'DASHBOARD_PORT');
    if (!port) return null;
    dashboardPort = port;
    const pid = await spawnAndWait(
      'frontend',
      process.execPath,
      [path.join(__dirname, 'static-server.js'), path.join(paths.installDir(), 'frontend-dist'), String(dashboardPort), String(backendPort)],
      { cwd: paths.installDir(), env: sharedEnv(), port: dashboardPort },
      Object.assign(() => httpOk(`http://127.0.0.1:${dashboardPort}/`), { strict: true })
    );
    if (pid) console.log(`Dashboard started (pid ${pid}) on http://127.0.0.1:${dashboardPort}`);
    return pid;
  });

  const url = `http://127.0.0.1:${dashboardPort}`;
  console.log('');
  if (state.frontend && state.backend) {
    console.log(paths.env('NO_OPEN') ? `Dashboard: ${url}` : `Opening ${url} in your browser...`);
    console.log(`Logs: ${logDir()}`);
    openBrowser(url);
  } else {
    console.log(`Not everything came up; see the messages above. Logs: ${logDir()}`);
    console.log(`Troubleshooting: ${TROUBLESHOOTING_URL}`);
    process.exitCode = 1;
  }
}

function stop({ quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const state = readRunState();
  let stoppedAny = false;
  for (const key of Object.keys(SERVICES)) {
    const pid = state[key];
    if (pid && proc.isOurs(pid, SERVICES[key].marker)) {
      try {
        proc.terminate(pid);
        log(`Stopped ${key} (pid ${pid}).`);
        stoppedAny = true;
      } catch (err) {
        log(`Could not stop ${key} (pid ${pid}): ${err.message}`);
      }
    } else if (pid) {
      log(`Skipped ${key}: pid ${pid} is no longer a knowyourtokens process.`);
    }
    delete state[key];
  }
  writeRunState(state);
  if (!stoppedAny) log('Nothing was running.');
}

async function status() {
  const state = readRunState();
  const backendPort = paths.backendPort();
  const dashboardPort = paths.dashboardPort();
  console.log(`Version:           ${paths.version()}`);
  console.log(`Install directory: ${paths.installDir()}`);
  console.log(`Claude settings:   ${paths.claudeSettingsPath()}`);
  console.log('');
  for (const key of Object.keys(SERVICES)) {
    const pid = state[key];
    console.log(`${key.padEnd(9)} ${proc.isOurs(pid, SERVICES[key].marker) ? `running (pid ${pid})` : 'not running'}`);
  }
  const backendUp = await httpOk(`http://127.0.0.1:${backendPort}/health`);
  const frontendUp = await httpOk(`http://127.0.0.1:${dashboardPort}/`);
  console.log('');
  console.log(`Backend health check:  ${backendUp ? 'OK' : 'unreachable'} (http://127.0.0.1:${backendPort}/health)`);
  console.log(`Dashboard reachable:   ${frontendUp ? 'OK' : 'unreachable'} (http://127.0.0.1:${dashboardPort}/)`);
  if (!backendUp || !frontendUp) {
    console.log(`  Not running? "knowyourtokens start". Running but unreachable? "knowyourtokens doctor" and ${logDir()}`);
  }
  console.log('');
  try {
    const enabled = require('./autostart').isEnabled();
    console.log(`Autostart at login:    ${enabled ? 'enabled' : 'not enabled'}`);
  } catch (err) {
    console.log(`Autostart at login:    unknown (${err.message})`);
  }
}

module.exports = { start, stop, status, httpOk, readRunState, SERVICES, diagnose, choosePort, portProblem };
