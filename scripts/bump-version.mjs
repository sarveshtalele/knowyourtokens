#!/usr/bin/env node
// Bump the shared version everywhere it lives and roll the CHANGELOG forward.
//
//   node scripts/bump-version.mjs patch|minor|major|X.Y.Z
//
// Prints the new version on stdout (and nothing else), so CI can capture it.
// Used by the Release workflow's "Run workflow" button; works the same locally.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/sarveshtalele/tokentelemetry';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const write = (p, s) => writeFileSync(join(ROOT, p), s);

function fail(msg) {
  console.error(`bump-version: ${msg}`);
  process.exit(1);
}

const arg = process.argv[2];
const current = JSON.parse(read('cli/package.json')).version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!m) fail(`cli/package.json has a version I can't bump: ${current}`);
const [maj, min, pat] = m.slice(1).map(Number);
const next =
  arg === 'major'
    ? `${maj + 1}.0.0`
    : arg === 'minor'
      ? `${maj}.${min + 1}.0`
      : arg === 'patch'
        ? `${maj}.${min}.${pat + 1}`
        : /^\d+\.\d+\.\d+$/.test(arg ?? '')
          ? arg
          : fail('usage: node scripts/bump-version.mjs patch|minor|major|X.Y.Z');
if (next === current) fail(`already at ${current}`);

/** Replace exactly one match of `re` in file `p`, or fail loudly. */
function sub(p, re, to) {
  const s = read(p);
  if (!re.test(s)) fail(`${p}: version not found (${re})`);
  write(p, s.replace(re, to));
}

for (const p of ['telemetry/__init__.py', 'sdk/python/src/tokentelemetry_client/__init__.py']) {
  sub(p, /^__version__ = "[^"]+"/m, `__version__ = "${next}"`);
}
sub('sdk/python/pyproject.toml', /^version = "[^"]+"/m, `version = "${next}"`);

for (const dir of ['cli', 'sdk/js', 'frontend', 'site']) {
  const pkg = `${dir}/package.json`;
  sub(pkg, /"version": "[^"]+"/, `"version": "${next}"`);
  const lock = `${dir}/package-lock.json`;
  if (existsSync(join(ROOT, lock))) {
    const j = JSON.parse(read(lock));
    j.version = next;
    if (j.packages?.['']) j.packages[''].version = next;
    write(lock, `${JSON.stringify(j, null, 2)}\n`);
  }
}

// The OpenAPI document carries the app version in info.version (CI checks it is in sync).
sub('docs/openapi.json', /("title": "Token Telemetry API",\s*"version": )"[^"]+"/, `$1"${next}"`);

// CHANGELOG: Unreleased notes become the new version's section.
const date = new Date().toISOString().slice(0, 10);
let log = read('CHANGELOG.md');
const head = '## [Unreleased]\n';
if (!log.includes(head)) fail('CHANGELOG.md has no "## [Unreleased]" heading');
const after = log.slice(log.indexOf(head) + head.length);
const notes = after.slice(0, after.search(/^## \[/m)).trim();
log = log.replace(
  head,
  `${head}\n## [${next}] - ${date}\n${notes ? '' : '\n### Changed\n- Maintenance release.\n'}`,
);
log = log.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${REPO}/compare/v${next}...HEAD`);
log = log.replace(/^(\[Unreleased\]: .*)$/m, `$1\n[${next}]: ${REPO}/compare/v${current}...v${next}`);
write('CHANGELOG.md', log.replace(/\n{3,}/g, '\n\n'));

console.log(next);
