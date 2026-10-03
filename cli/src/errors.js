// Errors people can act on. Anything thrown during install/start is turned into a short message
// that says what went wrong and how to fix it, plus a link to the troubleshooting guide.

const TROUBLESHOOTING_URL = 'https://sarveshtalele.github.io/knowyourtokens/#troubleshooting';

class KytError extends Error {
  /**
   * @param {string} message What went wrong, in one sentence.
   * @param {{hint?: string | string[], cause?: unknown}} [opts] How to fix it (one line per step).
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = 'KytError';
    this.hint = opts.hint;
    if (opts.cause !== undefined) this.cause = opts.cause;
  }
}

/** Map low-level Node errors (spawn, file system) to a message and a fix. */
function explain(err) {
  if (err instanceof KytError) return { message: err.message, hint: err.hint };
  const code = err && err.code;
  const target = (err && (err.path || err.dest || err.spawnargs?.[0])) || '';
  const isWin = process.platform === 'win32';
  switch (code) {
    case 'ENOENT':
      if (err.syscall && err.syscall.startsWith('spawn')) {
        return {
          message: `"${err.path}" isn't installed or isn't on your PATH.`,
          hint: 'Install it, open a new terminal so PATH is refreshed, then run the command again.',
        };
      }
      return { message: `File or folder not found: ${target}`, hint: 'Run "npx knowyourtokens install" again.' };
    case 'EACCES':
    case 'EPERM':
      return {
        message: `Permission denied${target ? ` on ${target}` : ''}.`,
        hint: isWin
          ? [
              'Close any open dashboard window and run "npx knowyourtokens stop".',
              'If antivirus quarantines files in the folder, allow it, then run the command again.',
              "Don't run the installer from an Administrator prompt once and a normal one later.",
            ]
          : [
              `Make sure your user owns ${target || 'the folder'} (no sudo needed or wanted).`,
              'Run "npx knowyourtokens stop", then the command again.',
            ],
      };
    case 'EBUSY':
      return {
        message: `A file is in use${target ? `: ${target}` : ''}.`,
        hint: 'Run "npx knowyourtokens stop", close any dashboard window, wait a few seconds, then try again.',
      };
    case 'ENOSPC':
      return { message: 'Your disk is full.', hint: 'Free up some space (about 300 MB is enough), then try again.' };
    case 'EADDRINUSE':
      return {
        message: 'A port Know Your Tokens needs is already in use.',
        hint: 'Run "npx knowyourtokens stop", or choose ports with KNOWYOURTOKENS_BACKEND_PORT / KNOWYOURTOKENS_DASHBOARD_PORT.',
      };
    default:
      return { message: (err && err.message) || String(err), hint: undefined };
  }
}

/** Print an error the way every command reports failures. */
function report(err, log = console.error) {
  const { message, hint } = explain(err);
  log('');
  log(`✖ ${message}`);
  const hints = Array.isArray(hint) ? hint : hint ? [hint] : [];
  if (hints.length) {
    log('');
    log('  How to fix it:');
    for (const h of hints) log(`   • ${h}`);
  }
  log('');
  log(`  Still stuck? Run "npx knowyourtokens doctor", or see ${TROUBLESHOOTING_URL}`);
  if (process.env.KNOWYOURTOKENS_DEBUG && err && err.stack) log(`\n${err.stack}`);
}

module.exports = { KytError, explain, report, TROUBLESHOOTING_URL };
