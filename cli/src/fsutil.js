const fs = require('fs');
const path = require('path');

/** Write via a temp file + rename so a crash never leaves a half-written file. */
function writeFileAtomic(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contents, 'utf8');
  fs.renameSync(tmp, file);
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('top level is not a JSON object');
    }
    return parsed;
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${err.message}). Fix it by hand, then re-run -- nothing was changed.`);
  }
}

module.exports = { writeFileAtomic, readJson };
