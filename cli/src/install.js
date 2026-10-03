const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const paths = require('./paths');
const hooks = require('./hooks');
const migrate = require('./migrate');
const prompt = require('./prompt');
const uvTools = require('./uv');
const { KytError, explain } = require('./errors');

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
        '"npx knowyourtokens@latest install" (or "npm install -g knowyourtokens@latest && knowyourtokens install").'
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
  // Autostart entries and app icons made before the rename run cli/bin/tokentelemetry.js: keep them working.
  fs.writeFileSync(
    path.join(dest, 'cli', 'bin', 'tokentelemetry.js'),
    "#!/usr/bin/env node\n// Kept for launchers created under the project's previous name.\nrequire('./knowyourtokens.js');\n",
    { mode: 0o755 }
  );
  fs.writeFileSync(path.join(dest, 'VERSION'), paths.version() + '\n', 'utf8');
  log(`Copied app files to ${dest}`);
}

function pythonVersionOk(cmd, baseArgs) {
  const res = spawnSync(cmd, [...baseArgs, '-c', 'import sys; print(sys.version_info >= (3, 10))'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return !res.error && res.status === 0 && res.stdout.trim() === 'True';
}

/** A system Python 3.10+ ({cmd, baseArgs}), or null. Skips the Microsoft Store "python" stub on Windows. */
function systemPython() {
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
  return candidates.find((c) => pythonVersionOk(c.cmd, c.baseArgs)) || null;
}

function findSystemPython() {
  const py = systemPython();
  if (!py) {
    throw new KytError('Python 3.10 or newer was not found.', {
      hint: [
        'Easiest: let the installer set up uv, which brings its own Python ("npx knowyourtokens install --yes").',
        `Or install Python 3.10+ from https://www.python.org/downloads/${process.platform === 'win32' ? ' (tick "Add python.exe to PATH")' : ''}.`,
      ],
    });
  }
  return py;
}

function run(cmd, args, opts = {}) {
  const { failure, ...spawnOpts } = opts;
  const res = spawnSync(cmd, args, { stdio: 'inherit', windowsHide: true, ...spawnOpts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw failure || new KytError(`Command failed (exit ${res.status}): ${cmd} ${args.join(' ')}`);
  }
}

const NETWORK_HINT = [
  'Check your internet connection (the first install downloads about 30 MB of Python packages).',
  'Behind a company proxy? Set HTTPS_PROXY (and HTTP_PROXY), then run the command again.',
  'Using a private package index? Set UV_INDEX_URL (uv) or PIP_INDEX_URL (pip).',
];

/**
 * Pick how to build the Python environment: uv if present; otherwise offer to install uv (it brings its
 * own Python); otherwise a system Python 3.10+. Returns {uv} or {python}.
 */
async function pythonToolchain({ yes = false, noUv = false } = {}) {
  if (!noUv) {
    const found = uvTools.findUv();
    if (found) return { uv: found };
  }
  const python = systemPython();
  if (noUv) {
    if (python) return { python };
    findSystemPython(); // throws the explanation
  }
  log('');
  log('uv is not installed. Know Your Tokens uses it to set up its own private Python, so you');
  log("don't need Python installed and nothing touches your system Python.");
  const wanted =
    yes || truthy(paths.env('INSTALL_UV'))
      ? true
      : await prompt.confirm('Install uv now?', { defaultYes: true, fallback: false });
  if (wanted) {
    try {
      return { uv: uvTools.installUv(log) };
    } catch (err) {
      if (!python) throw err;
      // A blocked download shouldn't sink the install when a usable Python is already here.
      log(`Couldn't install uv (see above), so continuing with ${pythonLabel(python)} instead.`);
      return { python };
    }
  }
  if (python) {
    log(`Continuing with ${pythonLabel(python)} instead of uv.`);
    if (!prompt.interactive()) log('(No terminal to ask in. Add --yes to install uv instead, or --no-uv to skip this message.)');
    return { python };
  }
  throw new KytError("Can't continue: neither uv nor Python 3.10+ is available.", {
    hint: [
      prompt.interactive()
        ? 'Run the command again and answer "y" to install uv.'
        : 'Run "npx knowyourtokens install --yes" to install uv without being asked.',
      `Or install uv yourself: ${uvTools.installCommand()}`,
      'Or install Python 3.10+ from https://www.python.org/downloads/',
    ],
  });
}

function pythonLabel(python) {
  return [python.cmd, ...python.baseArgs].join(' ');
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

async function setupPythonEnv(opts = {}) {
  const venv = paths.venvDir();
  const req = path.join(paths.installDir(), 'backend', 'requirements.txt');
  if (fs.existsSync(venv) && !fs.existsSync(paths.venvPython())) {
    log('The Python environment looks broken, recreating it.');
    fs.rmSync(venv, { recursive: true, force: true });
  }
  const tool = await pythonToolchain(opts);
  if (!fs.existsSync(venv)) {
    if (tool.uv) {
      log('Creating the Python environment with uv (downloads Python if needed)...');
      run(tool.uv, ['venv', '--python', '>=3.10', venv], {
        failure: new KytError("uv couldn't create the Python environment.", { hint: NETWORK_HINT }),
      });
    } else {
      log(`Creating the Python environment with ${tool.python.cmd}...`);
      run(tool.python.cmd, [...tool.python.baseArgs, '-m', 'venv', venv], {
        failure: new KytError("Python couldn't create a virtual environment.", {
          hint:
            process.platform === 'linux'
              ? 'On Debian/Ubuntu install the venv module: "sudo apt install python3-venv", or let the installer set up uv.'
              : 'Reinstall Python 3.10+ from python.org, or let the installer set up uv.',
        }),
      });
    }
  } else {
    log('Python environment already exists, reusing it.');
  }
  log('Installing Python dependencies...');
  const failure = new KytError("Python dependencies couldn't be installed.", { hint: NETWORK_HINT });
  if (tool.uv) {
    run(tool.uv, ['pip', 'install', '-q', '-p', paths.venvPython(), '-r', req], { failure });
  } else {
    run(paths.venvPython(), ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '--upgrade', 'pip'], { failure });
    run(paths.venvPython(), ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', req], { failure });
  }
}

/** Run one install step; on failure, say which step broke (the error itself carries the fix). */
async function step(label, fn) {
  log(`\n> ${label}`);
  try {
    return await fn();
  } catch (err) {
    if (err instanceof KytError) throw err;
    const { message, hint } = explain(err);
    throw new KytError(`${label} failed: ${message}`, { hint, cause: err });
  }
}

/**
 * Install or update. Options: yes (install uv without asking), noUv (use the system Python).
 */
async function install(opts = {}) {
  // Name the destination, not a pre-rename folder that the migration step below is about to move.
  const target = paths.installDirFromEnv() ? paths.installDir() : path.join(os.homedir(), '.knowyourtokens');
  log(`Know Your Tokens ${paths.version()}: installing into ${target}`);
  // Fail on a malformed settings.json before touching anything else.
  await step('Checking Claude Code settings', () => hooks.assertSettingsReadable());

  const needsDirMove =
    !paths.installDirFromEnv() &&
    fs.existsSync(paths.legacyInstallDir()) &&
    !fs.lstatSync(paths.legacyInstallDir()).isSymbolicLink() &&
    !fs.existsSync(path.join(os.homedir(), '.knowyourtokens'));
  const needsDbMove =
    !paths.env('DB') && !process.env.CLAUDE_TELEMETRY_DB && fs.existsSync(paths.legacyDbPath()) && !fs.existsSync(paths.defaultDbPath());
  if (needsDirMove || needsDbMove) {
    await step('Moving data from the old Token Telemetry locations', async () => {
      let autostartWasOn = false;
      try {
        autostartWasOn = require('./autostart').isEnabled();
      } catch {
        /* unknown: leave autostart alone */
      }
      require('./run').stop({ quiet: true });
      if (needsDirMove) migrate.migrateInstallDir(log);
      if (needsDbMove) migrate.migrateDatabase(log);
      if (needsDirMove && autostartWasOn) {
        try {
          require('./autostart').enable();
          log('Updated the autostart entry for the new location.');
        } catch (err) {
          log(`Couldn't update autostart (${err.message}); run "knowyourtokens autostart enable".`);
        }
      }
    });
  }

  await step('Copying app files', () => copyVendorFiles());
  await step('Setting up Python', () => setupPythonEnv(opts));
  const settings = await step('Connecting Claude Code', () => hooks.installHooks());
  log(`Claude Code hooks added to ${settings} (backup: settings.json.bak-knowyourtokens)`);
  log('');
  log(`Install complete (v${paths.version()}).`);
  log(`  App folder: ${paths.installDir()}`);
  log(`  Your data:  ${paths.dbPath()}`);
  log('');
  log('Next: "knowyourtokens start" opens the dashboard.');
  log('      "knowyourtokens autostart enable" starts it at login, "knowyourtokens shortcut" adds an app icon.');
}

function dbPath() {
  return paths.dbPath();
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
  log(`Deleted your usage database at ${db}`);
}

function uninstall({ purge = false, deleteDb = false } = {}) {
  try {
    const removed = hooks.uninstallHooks();
    log(removed ? `Removed ${removed} Know Your Tokens hook(s) from ${paths.claudeSettingsPath()}` : 'No Know Your Tokens hooks found.');
  } catch (err) {
    log(`Could not update ${paths.claudeSettingsPath()}: ${err.message}`);
  }

  const dirExists = fs.existsSync(paths.installDir());
  if (!purge) {
    if (dirExists) {
      log(`Left the app files in ${paths.installDir()} and your data in ${dbPath()}.`);
      log('Re-run with "knowyourtokens uninstall --purge" to remove them too.');
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
  const db = dbPath();
  if (deleteDb) deleteData();
  if (dirExists) {
    // The database lives in <installDir>/data since 2.4: keep it unless --delete-data was given.
    const dataDir = path.resolve(paths.installDir(), 'data');
    const keepData = !deleteDb && path.resolve(path.dirname(db)) === dataDir && fs.existsSync(dataDir);
    if (keepData) {
      for (const entry of fs.readdirSync(paths.installDir())) {
        if (entry !== 'data') fs.rmSync(path.join(paths.installDir(), entry), { recursive: true, force: true });
      }
      log(`Removed the app files from ${paths.installDir()} (kept your data in ${dataDir}).`);
    } else {
      fs.rmSync(paths.installDir(), { recursive: true, force: true });
      log(`Removed ${paths.installDir()}`);
    }
  }
  try {
    // The link left at ~/.tokentelemetry when an old install was moved.
    if (fs.lstatSync(paths.legacyInstallDir()).isSymbolicLink()) fs.unlinkSync(paths.legacyInstallDir());
  } catch {
    /* no link */
  }
  if (!deleteDb) log(`Kept your data at ${db} -- add --delete-data to remove it too.`);
}

module.exports = { install, uninstall, dbPath, setupPythonEnv, pythonToolchain, copyVendorFiles, findSystemPython, MANAGED };
