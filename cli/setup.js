#!/usr/bin/env node
// First run (or after pulling new commits): detects the system, builds +
// installs the `knowyourtokens` command globally, runs the app install
// (Python env + Claude Code hooks), then hands control to an interactive
// Start/Stop/Status/Uninstall menu.
//
// Every run after that doesn't need any of the build/install work redone —
// use the fast subcommands instead, which skip straight to the action:
//   node cli/setup.js start              Start the backend, daemon, and dashboard
//   node cli/setup.js stop               Stop everything
//   node cli/setup.js status             Show what's running
//   node cli/setup.js autostart enable   Start automatically at login
//   node cli/setup.js autostart disable  Remove the autostart entry
//   node cli/setup.js delete             Full teardown: remove hooks + ~/.knowyourtokens (--delete-data: + database)
//   node cli/setup.js uninstall          Remove hooks only, keep app files/database
//   node cli/setup.js install            Re-run the full build+install (e.g. after `git pull`)
//
// (Once installed, the equivalent "knowyourtokens start/stop/status/..."
// global command is just as fast — these subcommands exist for people who'd
// rather not depend on it being on PATH.)
'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { spawnSync } = require('child_process');

const CLI_DIR = __dirname;

function log(msg) {
  console.log(msg);
}
function section(title) {
  console.log(`\n== ${title} ==`);
}

function commandExists(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'ignore', shell: process.platform === 'win32' });
  return !res.error && res.status === 0;
}

function run(cmd, args, opts = {}) {
  log(`$ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`Command failed (exit ${res.status}): ${cmd} ${args.join(' ')}`);
}

function detectSystem() {
  section('Detecting system');
  const info = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    npm: commandExists('npm', ['--version']),
    python:
      commandExists('python3', ['-c', 'import sys; sys.exit(sys.version_info < (3, 10))']) ||
      commandExists('python', ['-c', 'import sys; sys.exit(sys.version_info < (3, 10))']),
    uv: commandExists('uv', ['--version']),
  };
  log(`Platform: ${info.platform} (${info.arch})`);
  log(`Node:     ${info.node}`);
  log(`npm:      ${info.npm ? 'found' : 'MISSING'}`);
  log(`Python:   ${info.python ? 'found' : 'MISSING (Python 3.10+ required)'}`);
  log(`uv:       ${info.uv ? 'found (will be used for the Python env)' : 'not found (will fall back to venv/pip)'}`);
  if (!info.npm) throw new Error('npm not found on PATH — install Node.js first.');
  if (!info.python) throw new Error('No Python 3 interpreter found on PATH — install Python 3.10+ (or uv) first.');
  return info;
}

function buildAndInstallGlobalCommand() {
  section('Building and installing the knowyourtokens command');
  const tmpTarball = path.join(os.tmpdir(), 'knowyourtokens-setup.tgz');
  run('npm', ['pack', '--pack-destination', os.tmpdir()], { cwd: CLI_DIR });
  const pkg = require(path.join(CLI_DIR, 'package.json'));
  const producedTarball = path.join(os.tmpdir(), `${pkg.name}-${pkg.version}.tgz`);
  fs.copyFileSync(producedTarball, tmpTarball);
  run('npm', ['install', '-g', tmpTarball]);
  log('Installed the global "knowyourtokens" command.');
}

function runLocalInstall() {
  section('Configuring the app (Python env + Claude Code hooks)');
  // Called in-process against this checkout's own src/, so it works
  // immediately regardless of whether the freshly-updated PATH is visible
  // yet in this shell.
  const { install } = require(path.join(CLI_DIR, 'src', 'install.js'));
  install();
}

function printMenu() {
  console.log('\nWhat would you like to do?');
  console.log('  1) Start the dashboard');
  console.log('  2) Stop the dashboard');
  console.log('  3) Show status');
  console.log('  4) Enable autostart at login');
  console.log('  5) Disable autostart at login');
  console.log('  6) Uninstall (remove Claude Code hooks)');
  console.log('  7) Exit');
  process.stdout.write('> ');
}

async function interactiveLoop() {
  const { start, stop, status } = require(path.join(CLI_DIR, 'src', 'run.js'));
  const { uninstall } = require(path.join(CLI_DIR, 'src', 'install.js'));
  const autostart = require(path.join(CLI_DIR, 'src', 'autostart.js'));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  printMenu();
  for await (const line of rl) {
    const choice = line.trim();
    try {
      switch (choice) {
        case '1':
          await start();
          break;
        case '2':
          stop();
          break;
        case '3':
          await status();
          break;
        case '4':
          autostart.enable();
          console.log('Autostart enabled — the dashboard will start automatically at login.');
          break;
        case '5':
          autostart.disable();
          console.log('Autostart disabled.');
          break;
        case '6': {
          rl.pause();
          const purge = await new Promise((resolve) =>
            rl.question('Also delete the app files AND the telemetry database? [y/N] ', (a) => resolve(/^y/i.test(a.trim())))
          );
          rl.resume();
          uninstall({ purge, deleteDb: purge });
          break;
        }
        case '7':
          rl.close();
          break;
        default:
          console.log(`Unrecognized choice: "${choice}"`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
    if (choice === '7') break;
    printMenu();
  }
  console.log('Done. Run "node cli/setup.js" again anytime, or use the "knowyourtokens" command directly.');
}

async function fullSetup() {
  detectSystem();
  buildAndInstallGlobalCommand();
  runLocalInstall();
  await interactiveLoop();
}

async function main() {
  const cmd = process.argv[2];
  const subCmd = process.argv[3];
  const { start, stop, status } = require(path.join(CLI_DIR, 'src', 'run.js'));
  const { uninstall } = require(path.join(CLI_DIR, 'src', 'install.js'));
  const autostart = require(path.join(CLI_DIR, 'src', 'autostart.js'));

  switch (cmd) {
    case undefined:
    case 'install':
      await fullSetup();
      break;
    case 'start':
      await start();
      break;
    case 'stop':
      stop();
      break;
    case 'status':
      await status();
      break;
    case 'autostart':
      if (subCmd === 'enable') {
        autostart.enable();
        console.log('Autostart enabled — the dashboard will start automatically at login.');
      } else if (subCmd === 'disable') {
        autostart.disable();
        console.log('Autostart disabled.');
      } else if (subCmd === 'status') {
        console.log(autostart.isEnabled() ? 'Autostart is enabled.' : 'Autostart is not enabled.');
      } else {
        console.error('Usage: node cli/setup.js autostart <enable|disable|status>');
        process.exitCode = 1;
      }
      break;
    case 'delete':
      uninstall({ purge: true, deleteDb: process.argv.includes('--delete-data') });
      break;
    case 'uninstall':
      uninstall({ purge: process.argv.includes('--purge'), deleteDb: process.argv.includes('--delete-data') });
      break;
    default:
      console.error(`Unknown command: "${cmd}"`);
      console.error('Usage: node cli/setup.js [install|start|stop|status|autostart|delete|uninstall]');
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exitCode = 1;
});
