const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const paths = require('./paths');
const proc = require('./process');

const STARTUP_TIMEOUT_MS = 20000;

// Substrings each service's command line must contain for `stop` to touch it.
const SERVICES = {
  backend: { marker: 'app.main:app', log: 'backend.log', label: 'Backend' },
  daemon: { marker: 'telemetry.daemon', log: 'daemon.log', label: 'Telemetry daemon' },
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
    throw new Error('Not installed yet. Run "tokentelemetry install" first.');
  }
}

function openBrowser(url) {
  if (process.env.TOKENTELEMETRY_NO_OPEN) return;
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

function portFree(port) {
  return new Promise((resolve) => {
    const srv = require('net').createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
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
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(300);
    if (!proc.isAlive(child.pid)) break;
    if (await ready()) return child.pid;
  }
  if (proc.isAlive(child.pid) && !ready.strict) return child.pid;
  const tail = tailLog(svc.log);
  console.log(`${svc.label} failed to start. Last output from ${logPath(svc.log)}:`);
  console.log(tail);
  if (/EADDRINUSE|address already in use/i.test(tail)) {
    console.log('(The port is already in use -- another tokentelemetry, or set TOKENTELEMETRY_*_PORT.)');
  }
  if (proc.isAlive(child.pid)) proc.terminate(child.pid);
  return null;
}

async function start() {
  ensureInstalled();
  const state = readRunState();
  const backendPort = paths.backendPort();
  const dashboardPort = paths.dashboardPort();
  const sharedEnv = {
    TOKENTELEMETRY_BACKEND_PORT: String(backendPort),
    TOKENTELEMETRY_DASHBOARD_PORT: String(dashboardPort),
    PYTHONUNBUFFERED: '1',
  };

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
    if (!(await portFree(backendPort))) {
      console.log(`Port ${backendPort} is busy -- set TOKENTELEMETRY_BACKEND_PORT to use another one.`);
      return null;
    }
    const pid = await spawnAndWait(
      'backend',
      paths.venvPython(),
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(backendPort), '--no-access-log'],
      { cwd: path.join(paths.installDir(), 'backend'), env: sharedEnv },
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
      { cwd: paths.installDir(), env: sharedEnv },
      async () => true
    );
    if (pid) console.log(`Telemetry daemon started (pid ${pid}).`);
    return pid;
  });

  await ensure('frontend', async () => {
    if (!(await portFree(dashboardPort))) {
      console.log(`Port ${dashboardPort} is busy -- set TOKENTELEMETRY_DASHBOARD_PORT to use another one.`);
      return null;
    }
    const pid = await spawnAndWait(
      'frontend',
      process.execPath,
      [path.join(__dirname, 'static-server.js'), path.join(paths.installDir(), 'frontend-dist'), String(dashboardPort), String(backendPort)],
      { cwd: paths.installDir(), env: sharedEnv },
      Object.assign(() => httpOk(`http://127.0.0.1:${dashboardPort}/`), { strict: true })
    );
    if (pid) console.log(`Dashboard started (pid ${pid}) on http://127.0.0.1:${dashboardPort}`);
    return pid;
  });

  const url = `http://127.0.0.1:${dashboardPort}`;
  console.log('');
  if (state.frontend && state.backend) {
    console.log(`Opening ${url} in your browser...`);
    console.log(`Logs: ${logDir()}`);
    openBrowser(url);
  } else {
    console.log(`Not everything came up -- see the errors above. Logs: ${logDir()}`);
    process.exitCode = 1;
  }
}

function stop() {
  const state = readRunState();
  let stoppedAny = false;
  for (const key of Object.keys(SERVICES)) {
    const pid = state[key];
    if (pid && proc.isOurs(pid, SERVICES[key].marker)) {
      try {
        proc.terminate(pid);
        console.log(`Stopped ${key} (pid ${pid}).`);
        stoppedAny = true;
      } catch (err) {
        console.log(`Could not stop ${key} (pid ${pid}): ${err.message}`);
      }
    } else if (pid) {
      console.log(`Skipped ${key}: pid ${pid} is no longer a tokentelemetry process.`);
    }
    delete state[key];
  }
  writeRunState(state);
  if (!stoppedAny) console.log('Nothing was running.');
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
    console.log(`  Not running? "tokentelemetry start". Running but unreachable? Check ${logDir()}`);
  }
  console.log('');
  try {
    const enabled = require('./autostart').isEnabled();
    console.log(`Autostart at login:    ${enabled ? 'enabled' : 'not enabled'}`);
  } catch (err) {
    console.log(`Autostart at login:    unknown (${err.message})`);
  }
}

module.exports = { start, stop, status, httpOk, readRunState, SERVICES };
