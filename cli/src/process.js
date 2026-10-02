// Process helpers. A PID from run.json is only trusted if the live process
// still looks like ours -- PIDs get reused, and `stop` must never kill an
// unrelated program that happens to have inherited the number.
const fs = require('fs');
const { spawnSync } = require('child_process');

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function commandLine(pid) {
  try {
    if (process.platform === 'linux') {
      return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ');
    }
    if (process.platform === 'win32') {
      const res = spawnSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`],
        { encoding: 'utf8', windowsHide: true }
      );
      return res.status === 0 ? res.stdout : null;
    }
    const res = spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
    return res.status === 0 ? res.stdout : null;
  } catch {
    return null;
  }
}

/** True only if pid is alive AND its command line contains `marker`. */
function isOurs(pid, marker) {
  if (!isAlive(pid)) return false;
  const cmd = commandLine(pid);
  // If the OS won't tell us, fall back to liveness rather than refusing forever.
  return cmd === null ? true : cmd.includes(marker);
}

function terminate(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM'); // whole process group (spawned detached => own group)
  } catch {
    process.kill(pid, 'SIGTERM');
  }
}

module.exports = { isAlive, isOurs, terminate, commandLine };
