const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const paths = require('./paths');
const hooks = require('./hooks');

// Directories this package owns inside installDir. They are replaced wholesale
// on every install so files deleted upstream don't linger; user state
// (.venv, logs, run.json, the database) lives outside them.
const MANAGED = ['backend', 'telemetry', 'hooks', 'frontend-dist', 'cli'];

function log(msg) {
  console.log(msg);
}

function runningFromStableCopy() {
  return path.resolve(paths.packageRoot()) === path.resolve(paths.installDir(), 'cli');
}

function copyVendorFiles() {
  const src = paths.vendorDir();
  const dest = paths.installDir();
  if (runningFromStableCopy()) {
    throw new Error(
      'This is the launcher copy of the CLI, which carries no app files. Update or reinstall with ' +
        '"npx tokentelemetry@latest install" (or "npm install -g tokentelemetry@latest && tokentelemetry install").'
    );
  }
  if (!fs.existsSync(src)) {
    throw new Error(
      `Bundled app files not found at ${src}. This package was not built correctly (missing "vendor/" -- ` +
        `run "npm run prepack" in the cli/ source, or reinstall from npm).`
    );
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const dir of MANAGED) fs.rmSync(path.join(dest, dir), { recursive: true, force: true });
  for (const entry of fs.readdirSync(src)) {
    fs.cpSync(path.join(src, entry), path.join(dest, entry), { recursive: true, force: true });
  }
  // A stable copy of the CLI itself for launchers and autostart (npx's cache can be cleared).
  for (const part of ['bin', 'src', 'assets', 'package.json']) {
    const from = path.join(paths.packageRoot(), part);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dest, 'cli', part), { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(dest, 'VERSION'), paths.version() + '\n', 'utf8');
  log(`Copied app files to ${dest}`);
}

function commandExists(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'ignore' });
  return !res.error && res.status === 0;
}

function pythonVersionOk(cmd, baseArgs) {
  const res = spawnSync(cmd, [...baseArgs, '-c', 'import sys; print(sys.version_info >= (3, 10))'], {
    encoding: 'utf8',
  });
  return !res.error && res.status === 0 && res.stdout.trim() === 'True';
}

function findSystemPython() {
  const candidates =
    process.platform === 'win32'
      ? [
          { cmd: 'py', baseArgs: ['-3'] },
          { cmd: 'python', baseArgs: [] },
        ]
      : [
          { cmd: 'python3', baseArgs: [] },
          { cmd: 'python', baseArgs: [] },
        ];
  for (const c of candidates) {
    if (pythonVersionOk(c.cmd, c.baseArgs)) return c;
  }
  throw new Error('No Python 3.10+ interpreter found on PATH. Install Python 3.10+ (or uv) and re-run.');
}

function run(cmd, args, opts) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`Command failed (${res.status}): ${cmd} ${args.join(' ')}`);
}

function setupPythonEnv() {
  const venv = paths.venvDir();
  const req = path.join(paths.installDir(), 'backend', 'requirements.txt');
  const useUv = commandExists('uv', ['--version']);
  if (fs.existsSync(venv) && !fs.existsSync(paths.venvPython())) {
    log('Python environment looks broken -- recreating it.');
    fs.rmSync(venv, { recursive: true, force: true });
  }
  if (!fs.existsSync(venv)) {
    if (useUv) {
      log('Creating Python environment with uv...');
      run('uv', ['venv', '--python', '>=3.10', venv]);
    } else {
      log('uv not found on PATH -- falling back to the standard venv module.');
      const py = findSystemPython();
      run(py.cmd, [...py.baseArgs, '-m', 'venv', venv]);
    }
  } else {
    log('Python environment already exists, reusing it.');
  }
  log('Installing Python dependencies...');
  if (useUv) {
    run('uv', ['pip', 'install', '-p', paths.venvPython(), '-r', req]);
  } else {
    run(paths.venvPython(), ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '--upgrade', 'pip']);
    run(paths.venvPython(), ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', req]);
  }
}

function install() {
  // Fail on a malformed settings.json before touching anything else.
  hooks.assertSettingsReadable();
  copyVendorFiles();
  setupPythonEnv();
  const settings = hooks.installHooks();
  log(`Installed Claude Code telemetry hooks in ${settings} (backup: settings.json.bak-tokentelemetry)`);
  log('');
  log(`Install complete (v${paths.version()}).`);
  log(`  App directory: ${paths.installDir()}`);
  log(`  Python env:    ${paths.venvDir()}`);
  log('');
  log('Run "tokentelemetry start" to launch the backend, daemon, and dashboard.');
  log('Run "tokentelemetry autostart enable" to start it automatically at login.');
  log('Run "tokentelemetry shortcut" to add an app icon you can pin to your Dock / taskbar.');
}

function dbPath() {
  return process.env.CLAUDE_TELEMETRY_DB || path.join(paths.claudeConfigDir(), 'telemetry', 'telemetry.db');
}

function deleteData() {
  const db = dbPath();
  const dir = path.dirname(db);
  const base = path.basename(db);
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (entry === base || entry.startsWith(`${base}-`) || entry.startsWith(`${base}.bak`) || entry === 'hook-errors.log') {
      fs.rmSync(path.join(dir, entry), { force: true });
    }
  }
  log(`Deleted the telemetry database at ${db}`);
}

function uninstall({ purge = false, deleteDb = false } = {}) {
  try {
    const removed = hooks.uninstallHooks();
    log(removed ? `Removed ${removed} telemetry hook(s) from ${paths.claudeSettingsPath()}` : 'No telemetry hooks found.');
  } catch (err) {
    log(`Could not update ${paths.claudeSettingsPath()}: ${err.message}`);
  }

  const dirExists = fs.existsSync(paths.installDir());
  if (!purge) {
    if (dirExists) {
      log(`Left app files and the telemetry database in place at ${paths.installDir()}.`);
      log('Re-run with "tokentelemetry uninstall --purge" to remove them too.');
    }
    return;
  }
  try {
    // Detached services would survive deleting installDir (which holds
    // run.json) and keep their ports -- stop them first.
    require('./run').stop();
  } catch (err) {
    log(`Could not stop running services (continuing): ${err.message}`);
  }
  try {
    const removed = require('./shortcut').remove();
    if (removed.length) log(`Removed app shortcuts: ${removed.join(', ')}`);
  } catch (err) {
    log(`Could not remove app shortcuts (continuing): ${err.message}`);
  }
  try {
    const autostart = require('./autostart');
    if (autostart.isEnabled()) {
      autostart.disable();
      log('Disabled autostart.');
    }
  } catch (err) {
    log(`Could not check/disable autostart (continuing): ${err.message}`);
  }
  if (dirExists) {
    fs.rmSync(paths.installDir(), { recursive: true, force: true });
    log(`Removed ${paths.installDir()}`);
  }
  if (deleteDb) {
    deleteData();
  } else {
    log(`Kept the telemetry database at ${dbPath()} -- add --delete-data to remove it too.`);
  }
}

module.exports = { install, uninstall, dbPath, setupPythonEnv, copyVendorFiles, findSystemPython, MANAGED };
