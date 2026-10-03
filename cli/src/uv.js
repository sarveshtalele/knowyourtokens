// uv (https://docs.astral.sh/uv/) creates Know Your Tokens' private Python environment. It brings its own
// Python when the machine has none, which is why it's the recommended path, especially on Windows.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { KytError } = require('./errors');

const UV_DOCS = 'https://docs.astral.sh/uv/getting-started/installation/';
const UNIX_INSTALL = 'curl -LsSf https://astral.sh/uv/install.sh | sh';
const WINDOWS_INSTALL = 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"';

function exe(name) {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

function works(cmd) {
  const res = spawnSync(cmd, ['--version'], { stdio: 'ignore', windowsHide: true });
  return !res.error && res.status === 0;
}

/** Where the official installer puts uv when it isn't on PATH yet (a new terminal hasn't been opened). */
function candidateLocations(env = process.env, home = os.homedir()) {
  const dirs = [];
  if (env.UV_INSTALL_DIR) dirs.push(env.UV_INSTALL_DIR, path.join(env.UV_INSTALL_DIR, 'bin'));
  if (env.XDG_BIN_HOME) dirs.push(env.XDG_BIN_HOME);
  dirs.push(path.join(home, '.local', 'bin'));
  dirs.push(path.join(env.CARGO_HOME || path.join(home, '.cargo'), 'bin'));
  if (process.platform === 'darwin') dirs.push('/opt/homebrew/bin', '/usr/local/bin');
  if (process.platform === 'win32' && env.LOCALAPPDATA) dirs.push(path.join(env.LOCALAPPDATA, 'Programs', 'uv'));
  return [...new Set(dirs)].map((d) => path.join(d, exe('uv')));
}

/** Absolute path (or bare "uv" when it's on PATH) of a working uv, or null. */
function findUv() {
  if (works('uv')) return 'uv';
  for (const candidate of candidateLocations()) {
    if (fs.existsSync(candidate) && works(candidate)) return candidate;
  }
  return null;
}

function installCommand() {
  return process.platform === 'win32' ? WINDOWS_INSTALL : UNIX_INSTALL;
}

/** Run Astral's official installer, then return the path of the uv it installed. */
function installUv(log = console.log) {
  log('');
  log(`Installing uv with the official installer (${UV_DOCS})...`);
  let res;
  if (process.platform === 'win32') {
    res = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'ByPass', '-Command', 'irm https://astral.sh/uv/install.ps1 | iex'],
      { stdio: 'inherit', windowsHide: false },
    );
  } else {
    const fetcher = works('curl')
      ? 'curl -LsSf https://astral.sh/uv/install.sh'
      : works('wget')
        ? 'wget -qO- https://astral.sh/uv/install.sh'
        : null;
    if (!fetcher) {
      throw new KytError('Neither curl nor wget is available to download uv.', {
        hint: [`Install uv another way (${UV_DOCS}), e.g. "brew install uv" or "pipx install uv".`, 'Then run the command again.'],
      });
    }
    res = spawnSync('sh', ['-c', `${fetcher} | sh`], { stdio: 'inherit' });
  }
  const uv = findUv();
  if (res.error || res.status !== 0 || !uv) {
    throw new KytError("uv couldn't be installed automatically.", {
      cause: res.error,
      hint: [
        'Check your internet connection. Behind a company proxy? Set HTTPS_PROXY first.',
        process.platform === 'win32'
          ? 'If PowerShell scripts are blocked by policy, install uv with "winget install --id=astral-sh.uv -e".'
          : 'Or install it with Homebrew ("brew install uv") or pipx ("pipx install uv").',
        `Manual install: ${UV_DOCS}`,
        'Then run "npx knowyourtokens" again.',
      ],
    });
  }
  log(`uv is ready (${uv === 'uv' ? 'on PATH' : uv}).`);
  return uv;
}

module.exports = { findUv, installUv, installCommand, candidateLocations, UV_DOCS };
