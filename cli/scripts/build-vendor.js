#!/usr/bin/env node
// Bundles backend/, telemetry/, hooks/, requirements files, and a built
// frontend/dist into cli/vendor/ so the published npm package is self
// contained (npx tokentelemetry install needs no separate git clone).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI_ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(CLI_ROOT, '..');
const VENDOR = path.join(CLI_ROOT, 'vendor');

function log(msg) {
  console.log(`[build-vendor] ${msg}`);
}

function run(cmd, args, cwd) {
  log(`${cmd} ${args.join(' ')} (cwd: ${cwd})`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
}

function copyFiltered(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const base = path.basename(srcPath);
      if (base === '__pycache__' || base.endsWith('.pyc') || base === 'requirements-dev.txt' || base === 'run.py') {
        return false;
      }
      return true;
    },
  });
}

function buildFrontend() {
  const frontendDir = path.join(REPO_ROOT, 'frontend');
  const nodeModules = path.join(frontendDir, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    run('npm', ['install'], frontendDir);
  }
  run('npm', ['run', 'build'], frontendDir);
  const dist = path.join(frontendDir, 'dist');
  if (!fs.existsSync(dist)) throw new Error('frontend build did not produce a dist/ directory');
  return dist;
}

function main() {
  if (fs.existsSync(VENDOR)) fs.rmSync(VENDOR, { recursive: true, force: true });
  fs.mkdirSync(VENDOR, { recursive: true });

  log('Bundling backend/, telemetry/, hooks/…');
  copyFiltered(path.join(REPO_ROOT, 'backend'), path.join(VENDOR, 'backend'));
  copyFiltered(path.join(REPO_ROOT, 'telemetry'), path.join(VENDOR, 'telemetry'));
  copyFiltered(path.join(REPO_ROOT, 'hooks'), path.join(VENDOR, 'hooks'));
  // backend/requirements.txt (the only Python deps "tokentelemetry start" needs)
  // is already inside vendor/backend/ from the copy above.
  fs.copyFileSync(path.join(REPO_ROOT, 'LICENSE'), path.join(CLI_ROOT, 'LICENSE'));

  log('Building frontend…');
  const dist = buildFrontend();
  copyFiltered(dist, path.join(VENDOR, 'frontend-dist'));

  log(`Vendor bundle ready at ${VENDOR}`);
}

main();
