// Yes/no questions in the terminal. Never blocks a non-interactive run (CI, autostart, piped input):
// those get the safe answer the caller passes as `fallback`.
const readline = require('readline');

function interactive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && !process.env.CI;
}

/**
 * Ask "question [Y/n]" (or "[y/N]") and resolve to a boolean.
 * @param {string} question
 * @param {{defaultYes?: boolean, fallback?: boolean}} [opts]
 */
function confirm(question, { defaultYes = true, fallback = false } = {}) {
  if (!interactive()) return Promise.resolve(fallback);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} ${defaultYes ? '[Y/n]' : '[y/N]'} `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === '' ? defaultYes : a === 'y' || a === 'yes');
    });
    rl.on('SIGINT', () => {
      rl.close();
      resolve(false);
    });
  });
}

module.exports = { confirm, interactive };
