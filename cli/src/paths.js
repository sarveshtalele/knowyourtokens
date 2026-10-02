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

/**
 * ~/.knowyourtokens, or ~/.tokentelemetry when only an install from before the
 * rename exists (it is reused as is: hooks, launchers and data keep working).
 */
function installDir() {
  const explicit = env('HOME');
  if (explicit) return explicit;
  const current = path.join(os.homedir(), '.knowyourtokens');
  const legacy = path.join(os.homedir(), '.tokentelemetry');
  const fs = require('fs');
  return !fs.existsSync(current) && fs.existsSync(legacy) ? legacy : current;
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

function intEnv(name, fallback) {
  const n = Number.parseInt(env(name), 10);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

function backendPort() {
  return intEnv('BACKEND_PORT', 8000);
}

function dashboardPort() {
  return intEnv('DASHBOARD_PORT', 5173);
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
