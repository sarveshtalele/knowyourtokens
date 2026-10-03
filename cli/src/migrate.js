// One-time moves for installs made before the rename to Know Your Tokens:
//   ~/.tokentelemetry               -> ~/.knowyourtokens        (app files, Python env, logs)
//   ~/.claude/telemetry/telemetry.db -> ~/.knowyourtokens/data/knowyourtokens.db
// Both are best effort: if a move can't happen (a file is locked on Windows, say), the old location
// keeps working because paths.js and telemetry/config.py fall back to it, and the next install retries.
const fs = require('fs');
const os = require('os');
const path = require('path');
const paths = require('./paths');

function moveDir(from, to) {
  try {
    fs.renameSync(from, to);
  } catch (err) {
    if (!['EXDEV', 'EPERM', 'EACCES', 'EBUSY'].includes(err.code)) throw err;
    // Different drive, or Windows refusing a rename: copy, then remove the original.
    fs.cpSync(from, to, { recursive: true, force: true, preserveTimestamps: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}

/**
 * Move an old ~/.tokentelemetry install to ~/.knowyourtokens. Services must be stopped first (the caller
 * does it). Leaves a link at the old path so launchers and autostart entries created back then still
 * resolve. Returns true when something moved.
 */
function migrateInstallDir(log = console.log) {
  if (paths.installDirFromEnv()) return false;
  const legacy = paths.legacyInstallDir();
  const current = path.join(os.homedir(), '.knowyourtokens');
  if (!fs.existsSync(legacy) || fs.existsSync(current)) return false;
  if (fs.lstatSync(legacy).isSymbolicLink()) return false;
  log(`Moving your existing install from ${legacy} to ${current}...`);
  moveDir(legacy, current);
  try {
    fs.symlinkSync(current, legacy, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    /* no link: autostart is re-created by the caller, and "knowyourtokens shortcut" refreshes icons */
  }
  return true;
}

// The database and the files SQLite keeps next to it, renamed together.
const SIDECARS = ['', '-wal', '-shm', '-journal'];

/**
 * Move a database still at ~/.claude/telemetry/telemetry.db into ~/.knowyourtokens/data. Skipped when
 * KNOWYOURTOKENS_DB / CLAUDE_TELEMETRY_DB pins a path. Rolls back if the main file can't move.
 */
function migrateDatabase(log = console.log) {
  if (paths.env('DB') || process.env.CLAUDE_TELEMETRY_DB) return false;
  const legacy = paths.legacyDbPath();
  const target = paths.defaultDbPath();
  if (!fs.existsSync(legacy) || fs.existsSync(target)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const moved = [];
  try {
    for (const suffix of SIDECARS) {
      if (fs.existsSync(legacy + suffix)) {
        fs.renameSync(legacy + suffix, target + suffix);
        moved.push(suffix);
      }
    }
  } catch (err) {
    for (const suffix of moved.reverse()) {
      try {
        fs.renameSync(target + suffix, legacy + suffix);
      } catch {
        /* best effort */
      }
    }
    log(`Kept your data at ${legacy} for now (${err.code || err.message}); it moves on the next install.`);
    return false;
  }
  const oldLog = path.join(path.dirname(legacy), 'hook-errors.log');
  if (fs.existsSync(oldLog)) {
    try {
      fs.renameSync(oldLog, path.join(path.dirname(target), 'hook-errors.log'));
    } catch {
      /* the old log is only for diagnosis */
    }
  }
  try {
    fs.rmdirSync(path.dirname(legacy)); // only if now empty
  } catch {
    /* backups or other files remain: leave the folder */
  }
  log(`Moved your data to ${target}`);
  return true;
}

module.exports = { migrateInstallDir, migrateDatabase };
