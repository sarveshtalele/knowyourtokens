const os = require('os');
const path = require('path');

function packageRoot() {
  return path.join(__dirname, '..');
}

function vendorDir() {
  return path.join(packageRoot(), 'vendor');
}

function installDir() {
  return process.env.TOKENTELEMETRY_HOME || path.join(os.homedir(), '.tokentelemetry');
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
  const n = Number.parseInt(process.env[name] || '', 10);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

function backendPort() {
  return intEnv('TOKENTELEMETRY_BACKEND_PORT', 8000);
}

function dashboardPort() {
  return intEnv('TOKENTELEMETRY_DASHBOARD_PORT', 5173);
}

function version() {
  return require(path.join(packageRoot(), 'package.json')).version;
}

module.exports = {
  packageRoot,
  vendorDir,
  installDir,
  venvDir,
  venvPython,
  claudeConfigDir,
  claudeSettingsPath,
  runStatePath,
  logDir,
  backendPort,
  dashboardPort,
  version,
};
