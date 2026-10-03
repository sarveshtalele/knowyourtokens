const os = require('os');
const path = require('path');

function packageRoot() {
  return path.join(__dirname, '..');
}

function vendorDir() {
  return path.join(packageRoot(), 'vendor');
}

/**
 * KNOWYOURTOKENS_<NAME>, falling back to TOKENTELEMETRY_<NAME> (the project's
 * previous name) so existing setups keep working.
 */
function env(name) {
  return process.env[`KNOWYOURTOKENS_${name}`] || process.env[`TOKENTELEMETRY_${name}`] || '';
}

/** Where installs made before the rename keep their app files (moved on the next install). */
function legacyInstallDir() {
  return path.join(os.homedir(), '.tokentelemetry');
}

/** True when KNOWYOURTOKENS_HOME (or the old TOKENTELEMETRY_HOME) picks the install directory. */
function installDirFromEnv() {
  return Boolean(env('HOME'));
}

/**
 * ~/.knowyourtokens. An install from before the rename (~/.tokentelemetry) is used until
 * "knowyourtokens install" moves it here, so hooks, launchers and data keep working meanwhile.
 */
function installDir() {
  const explicit = env('HOME');
  if (explicit) return explicit;
  const current = path.join(os.homedir(), '.knowyourtokens');
  const legacy = legacyInstallDir();
  const fs = require('fs');
  return !fs.existsSync(current) && fs.existsSync(legacy) ? legacy : current;
}

/** Where the database lives for new installs: next to the app, in one folder. */
function defaultDbPath() {
  const home = env('HOME') || path.join(os.homedir(), '.knowyourtokens');
  return path.join(home, 'data', 'knowyourtokens.db');
}

/** Before 2.4 the database defaulted to ~/.claude/telemetry/telemetry.db. */
function legacyDbPath() {
  return path.join(claudeConfigDir(), 'telemetry', 'telemetry.db');
}

/**
 * The database the app uses. Must match telemetry/config.py db_path():
 * KNOWYOURTOKENS_DB > CLAUDE_TELEMETRY_DB (old name) > the new default if it exists >
 * the pre-2.4 location if a database is still there (until install moves it) > the new default.
 */
function dbPath() {
  const explicit = env('DB') || process.env.CLAUDE_TELEMETRY_DB;
  if (explicit) return explicit;
  const fs = require('fs');
  const current = defaultDbPath();
  if (!fs.existsSync(current) && fs.existsSync(legacyDbPath())) return legacyDbPath();
  return current;
}

/** Ports picked by "start" when the default was taken (Windows reserves ranges for Hyper-V/WSL). */
function savedPorts() {
  try {
    return JSON.parse(require('fs').readFileSync(path.join(installDir(), 'ports.json'), 'utf8'));
  } catch {
    return {};
  }
}

function savePorts(ports) {
  const fs = require('fs');
  fs.mkdirSync(installDir(), { recursive: true });
  fs.writeFileSync(path.join(installDir(), 'ports.json'), JSON.stringify(ports, null, 2) + '\n', 'utf8');
}

function venvDir() {
  return path.join(installDir(), '.venv');
}

function venvPython() {
  return process.platform === 'win32'
    ? path.join(venvDir(), 'Scripts', 'python.exe')
    : path.join(venvDir(), 'bin', 'python');
}

function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

/** Where each supported agent keeps its session logs (mirrors telemetry/sources). */
function agentDataPaths() {
  const home = os.homedir();
  const codexHome = process.env.CODEX_HOME || path.join(home, '.codex');
  const geminiHome = path.join(process.env.GEMINI_CLI_HOME || home, '.gemini');
  const xdgData = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
  return [
    { name: 'Claude Code', path: path.join(claudeConfigDir(), 'projects') },
    { name: 'Codex CLI', path: path.join(codexHome, 'sessions') },
    { name: 'Gemini CLI', path: path.join(geminiHome, 'tmp') },
    { name: 'OpenCode', path: process.env.OPENCODE_DB || path.join(xdgData, 'opencode', 'opencode.db') },
  ];
}

function claudeSettingsPath() {
  return path.join(claudeConfigDir(), 'settings.json');
}

function runStatePath() {
  return path.join(installDir(), 'run.json');
}

function logDir() {
  return path.join(installDir(), 'logs');
}

function validPort(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : null;
}

/** True when the user chose this port explicitly (then "start" never swaps it for another). */
function portFromEnv(name) {
  return validPort(env(name)) !== null;
}

// Port precedence: environment variable > the port "start" last picked (ports.json) > default.
function backendPort() {
  return validPort(env('BACKEND_PORT')) || validPort(savedPorts().backend) || 8000;
}

function dashboardPort() {
  return validPort(env('DASHBOARD_PORT')) || validPort(savedPorts().dashboard) || 5173;
}

/**
 * The CLI entry point that launchers (shortcuts, autostart) should run.
 * `install` copies the CLI into <installDir>/cli, which -- unlike npx's
 * cache -- survives `npm cache clean`; fall back to this package otherwise.
 */
function stableBinPath() {
  const stable = path.join(installDir(), 'cli', 'bin', 'knowyourtokens.js');
  return require('fs').existsSync(stable) ? stable : path.join(packageRoot(), 'bin', 'knowyourtokens.js');
}

function version() {
  return require(path.join(packageRoot(), 'package.json')).version;
}

module.exports = {
  env,
  legacyInstallDir,
  installDirFromEnv,
  defaultDbPath,
  legacyDbPath,
  dbPath,
  savedPorts,
  savePorts,
  portFromEnv,
  packageRoot,
  vendorDir,
  installDir,
  venvDir,
  venvPython,
  claudeConfigDir,
  claudeSettingsPath,
  agentDataPaths,
  runStatePath,
  logDir,
  backendPort,
  dashboardPort,
  version,
  stableBinPath,
};
