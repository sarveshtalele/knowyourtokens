// Registers/removes an OS-level "start knowyourtokens at login" entry:
//   Windows -> Task Scheduler task (PowerShell)
//   macOS   -> launchd LaunchAgent
//   Linux   -> systemd --user service
//
// Each runs `start` via absolute paths to node and this package's bin script
// (schedulers don't source your shell profile, so PATH lookups fail).
//
// `start` spawns detached services and exits. The scheduler entries are
// written so that exit is expected and the children are left running:
//   systemd: Type=oneshot + RemainAfterExit + KillMode=process
//   launchd: AbandonProcessGroup
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const paths = require('./paths');

const TASK_NAME = 'Know Your Tokens';
const LAUNCHD_LABEL = 'com.knowyourtokens.app';
const SYSTEMD_UNIT = 'knowyourtokens.service';
// Entries registered under the project's previous names; removed on enable and disable.
const LEGACY_TASK_NAMES = ['Token Telemetry', 'Claude Token Telemetry'];
const LEGACY_LAUNCHD_LABELS = ['com.tokentelemetry.app'];
const LEGACY_SYSTEMD_UNITS = ['tokentelemetry.service'];

function binScriptPath() {
  return paths.stableBinPath();
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, ...opts });
}

// ---------- Windows (Task Scheduler) ----------

/** PowerShell single-quoted literal: only ' needs escaping (as ''). */
function psQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function windowsEnable() {
  windowsDisable(LEGACY_TASK_NAMES);
  const ps = [
    `$Action = New-ScheduledTaskAction -Execute ${psQuote(process.execPath)} -Argument ${psQuote(`"${binScriptPath()}" start`)}`,
    '$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME',
    '$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited',
    '$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)',
    `Register-ScheduledTask -TaskName ${psQuote(TASK_NAME)} -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null`,
  ].join('\n');
  const res = run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps]);
  if (res.error || res.status !== 0) {
    throw new Error(`Could not register the Task Scheduler task: ${res.stderr || res.error?.message || 'unknown error'}`);
  }
}

function windowsDisable(names = [TASK_NAME, ...LEGACY_TASK_NAMES]) {
  for (const name of names) {
    run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Unregister-ScheduledTask -TaskName ${psQuote(name)} -Confirm:$false -ErrorAction SilentlyContinue`,
    ]);
  }
}

function windowsStatus() {
  const res = run('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `$null -ne (Get-ScheduledTask -TaskName ${psQuote(TASK_NAME)} -ErrorAction SilentlyContinue)`,
  ]);
  return !res.error && res.status === 0 && res.stdout.trim() === 'True';
}

// ---------- macOS (launchd) ----------

function launchdPlistPath(label = LAUNCHD_LABEL) {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
}

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function macEnable() {
  macDisable(LEGACY_LAUNCHD_LABELS);
  fs.mkdirSync(paths.logDir(), { recursive: true });
  const logFile = xmlEscape(path.join(paths.logDir(), 'autostart.log'));
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(process.execPath)}</string>
    <string>${xmlEscape(binScriptPath())}</string>
    <string>start</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>KNOWYOURTOKENS_NO_OPEN</key><string>1</string></dict>
  <key>RunAtLoad</key><true/>
  <key>AbandonProcessGroup</key><true/>
  <key>StandardOutPath</key><string>${logFile}</string>
  <key>StandardErrorPath</key><string>${logFile}</string>
</dict>
</plist>
`;
  const plistPath = launchdPlistPath();
  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.writeFileSync(plistPath, plist, 'utf8');
  run('launchctl', ['unload', plistPath]); // fine if it wasn't loaded
  const res = run('launchctl', ['load', '-w', plistPath]);
  if (res.error || res.status !== 0) {
    throw new Error(`Could not load the launchd agent: ${res.stderr || res.error?.message || 'unknown error'}`);
  }
}

function macDisable(labels = [LAUNCHD_LABEL, ...LEGACY_LAUNCHD_LABELS]) {
  for (const label of labels) {
    const plistPath = launchdPlistPath(label);
    if (fs.existsSync(plistPath)) {
      run('launchctl', ['unload', plistPath]);
      fs.rmSync(plistPath, { force: true });
    }
  }
}

function macStatus() {
  return fs.existsSync(launchdPlistPath());
}

// ---------- Linux (systemd --user) ----------

function systemdUnitPath(unit = SYSTEMD_UNIT) {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'systemd', 'user', unit);
}

/** systemd quoting: double quotes, with \ and " escaped; % doubled (specifier char). */
function sdQuote(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%')}"`;
}

function linuxUnit() {
  const node = sdQuote(process.execPath);
  const script = sdQuote(binScriptPath());
  return `[Unit]
Description=Know Your Tokens (backend + daemon + dashboard)
After=default.target

[Service]
Type=oneshot
RemainAfterExit=yes
KillMode=process
Environment=KNOWYOURTOKENS_NO_OPEN=1
ExecStart=${node} ${script} start
ExecStop=${node} ${script} stop

[Install]
WantedBy=default.target
`;
}

function linuxEnable() {
  linuxDisable(LEGACY_SYSTEMD_UNITS);
  const unitPath = systemdUnitPath();
  fs.mkdirSync(path.dirname(unitPath), { recursive: true });
  fs.writeFileSync(unitPath, linuxUnit(), 'utf8');
  run('systemctl', ['--user', 'daemon-reload']);
  const res = run('systemctl', ['--user', 'enable', '--now', SYSTEMD_UNIT]);
  if (res.error || res.status !== 0) {
    throw new Error(
      `Could not enable the systemd user service: ${res.stderr || res.error?.message || 'unknown error'}.\n` +
        `Minimal/headless Linux setups may not run a user systemd instance -- see docs/INSTALLATION.md.`
    );
  }
}

function linuxDisable(units = [SYSTEMD_UNIT, ...LEGACY_SYSTEMD_UNITS]) {
  for (const unit of units) {
    const unitPath = systemdUnitPath(unit);
    if (!fs.existsSync(unitPath)) continue;
    run('systemctl', ['--user', 'disable', unit]);
    fs.rmSync(unitPath, { force: true });
  }
  run('systemctl', ['--user', 'daemon-reload']);
}

function linuxStatus() {
  const res = run('systemctl', ['--user', 'is-enabled', SYSTEMD_UNIT]);
  return !res.error && res.stdout.trim() === 'enabled';
}

// ---------- Dispatch ----------

const IMPL = {
  win32: { enable: windowsEnable, disable: windowsDisable, isEnabled: windowsStatus },
  darwin: { enable: macEnable, disable: macDisable, isEnabled: macStatus },
  linux: { enable: linuxEnable, disable: linuxDisable, isEnabled: linuxStatus },
};

function impl() {
  const i = IMPL[process.platform];
  if (!i) throw new Error(`Autostart isn't supported on platform "${process.platform}".`);
  return i;
}

module.exports = {
  enable: () => impl().enable(),
  disable: () => impl().disable(),
  isEnabled: () => (IMPL[process.platform] ? impl().isEnabled() : false),
  // exported for tests
  linuxUnit,
  psQuote,
  xmlEscape,
  sdQuote,
};
