import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { appFolder, resolvePorts } from '../src/ports';

function home(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kyt-vsc-'));
}

test('defaults when nothing is configured', () => {
  assert.deepEqual(resolvePorts({}, {}, home()), { backend: 8000, dashboard: 5173 });
});

test('the port the app picked (ports.json) is found', () => {
  const h = home();
  fs.mkdirSync(path.join(h, '.knowyourtokens'));
  fs.writeFileSync(path.join(h, '.knowyourtokens', 'ports.json'), JSON.stringify({ backend: 8001 }));
  assert.deepEqual(resolvePorts({}, {}, h), { backend: 8001, dashboard: 5173 });
});

test('env beats ports.json, settings beat env, 0 means automatic', () => {
  const h = home();
  fs.mkdirSync(path.join(h, '.knowyourtokens'));
  fs.writeFileSync(path.join(h, '.knowyourtokens', 'ports.json'), JSON.stringify({ backend: 8001 }));
  assert.equal(resolvePorts({}, { KNOWYOURTOKENS_BACKEND_PORT: '9000' }, h).backend, 9000);
  assert.equal(resolvePorts({ backendPort: 9100 }, { KNOWYOURTOKENS_BACKEND_PORT: '9000' }, h).backend, 9100);
  assert.equal(resolvePorts({ backendPort: 0 }, {}, h).backend, 8001);
});

test('a pre-rename install folder is used until it moves', () => {
  const h = home();
  fs.mkdirSync(path.join(h, '.tokentelemetry'));
  assert.equal(appFolder({}, h), path.join(h, '.tokentelemetry'));
  fs.mkdirSync(path.join(h, '.knowyourtokens'));
  assert.equal(appFolder({}, h), path.join(h, '.knowyourtokens'));
  assert.equal(appFolder({ KNOWYOURTOKENS_HOME: '/x' }, h), '/x');
});
