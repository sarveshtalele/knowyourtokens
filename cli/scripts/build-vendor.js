#!/usr/bin/env node
// Bundles backend/, telemetry/, hooks/, requirements files, and a built
// frontend/dist into cli/vendor/ so the published npm package is self
// contained (npx knowyourtokens install needs no separate git clone).
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
  // `npm publish --dry-run` exports npm_config_dry_run to lifecycle scripts, which would turn the
  // nested install into a no-op and fail the build; the build itself must always run for real.
  const env = { ...process.env };
  delete env.npm_config_dry_run;
  const res = spawnSync(cmd, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
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
    const lock = fs.existsSync(path.join(frontendDir, 'package-lock.json'));
    run('npm', [lock ? 'ci' : 'install', '--no-audit', '--no-fund'], frontendDir);
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
  // backend/requirements.txt (the only Python deps "knowyourtokens start" needs)
  // is already inside vendor/backend/ from the copy above.
  for (const f of ['LICENSE', 'NOTICE']) fs.copyFileSync(path.join(REPO_ROOT, f), path.join(CLI_ROOT, f));

  log('Building frontend…');
  const dist = buildFrontend();
  copyFiltered(dist, path.join(VENDOR, 'frontend-dist'));

  log(`Vendor bundle ready at ${VENDOR}`);
}

main();
