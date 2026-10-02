const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tt-cli-'));
}

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('installHooks preserves user hooks, replaces stale ones, and backs up', () => {
  const dir = tmpdir();
  const settings = path.join(dir, 'settings.json');
  fs.writeFileSync(
    settings,
    JSON.stringify({
      theme: 'dark',
      hooks: {
        Stop: [
          { hooks: [{ type: 'command', command: 'echo mine' }] },
          { hooks: [{ type: 'command', command: '"/old/python" "/old/hooks/claude-telemetry-hook.py"' }] },
        ],
      },
    })
  );
  withEnv({ CLAUDE_CONFIG_DIR: dir, TOKENTELEMETRY_HOME: path.join(dir, 'home') }, () => {
    const hooks = require('../src/hooks');
    hooks.installHooks();
    hooks.installHooks(); // idempotent
    const cfg = JSON.parse(fs.readFileSync(settings, 'utf8'));
    assert.strictEqual(cfg.theme, 'dark');
    const stopCommands = cfg.hooks.Stop.flatMap((g) => g.hooks.map((h) => h.command));
    assert.deepStrictEqual(stopCommands.filter((c) => c.includes('claude-telemetry-hook.py')).length, 1);
    assert.ok(stopCommands.includes('echo mine'));
    assert.ok(!stopCommands.some((c) => c.includes('/old/')));
    assert.deepStrictEqual(hooks.installedHookEvents().sort(), [...hooks.HOOK_EVENTS].sort());
    assert.ok(fs.existsSync(`${settings}.bak-tokentelemetry`));

    assert.strictEqual(hooks.uninstallHooks(), hooks.HOOK_EVENTS.length);
    const after = JSON.parse(fs.readFileSync(settings, 'utf8'));
    assert.deepStrictEqual(after.hooks, { Stop: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] });
  });
});

test('malformed settings.json fails without being modified', () => {
  const dir = tmpdir();
  const settings = path.join(dir, 'settings.json');
  fs.writeFileSync(settings, '{ not json');
  withEnv({ CLAUDE_CONFIG_DIR: dir }, () => {
    const hooks = require('../src/hooks');
    assert.throws(() => hooks.installHooks(), /not valid JSON/);
    assert.strictEqual(fs.readFileSync(settings, 'utf8'), '{ not json');
  });
});

test('systemd unit keeps detached services alive after start exits', () => {
  const unit = require('../src/autostart').linuxUnit();
  assert.match(unit, /Type=oneshot/);
  assert.match(unit, /RemainAfterExit=yes/);
  assert.match(unit, /KillMode=process/);
  assert.doesNotMatch(unit, /Restart=/);
});

test('scheduler quoting helpers escape hostile paths', () => {
  const a = require('../src/autostart');
  assert.strictEqual(a.psQuote("C:\\it's"), "'C:\\it''s'");
  assert.strictEqual(a.xmlEscape('a&<b>"'), 'a&amp;&lt;b&gt;&quot;');
  assert.strictEqual(a.sdQuote('/x/50%"y'), '"/x/50%%\\"y"');
});

test('static server: host allowlist, traversal, headers, SPA fallback', async () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>ok</html>');
  fs.writeFileSync(path.join(dir, 'assets', 'a.js'), 'x');
  const saved = process.argv;
  process.argv = ['node', 'static-server.js', dir, '0', '1'];
  delete require.cache[require.resolve('../src/static-server')];
  const { server, hostAllowed } = require('../src/static-server');
  process.argv = saved;
  assert.ok(hostAllowed('127.0.0.1:5173') && hostAllowed('localhost') && hostAllowed('[::1]:80'));
  assert.ok(!hostAllowed('evil.example') && !hostAllowed('127.0.0.1.evil.example:5173'));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const get = (p, host) =>
    new Promise((resolve) => {
      http.get({ host: '127.0.0.1', port, path: p, headers: host ? { host } : {} }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
    });
  try {
    const page = await get('/projects/foo');
    assert.strictEqual(page.status, 200);
    assert.match(page.body, /ok/);
    assert.match(page.headers['content-security-policy'], /default-src 'self'/);
    assert.strictEqual((await get('/assets/a.js')).headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.strictEqual((await get('/assets/missing.js')).status, 404);
    assert.strictEqual((await get('/', 'evil.example')).status, 403);
    assert.notStrictEqual((await get('/..%2f..%2fetc%2fpasswd')).body, fs.readFileSync('/etc/passwd', 'utf8'));
  } finally {
    server.close();
  }
});

test('ports are configurable and validated', () => {
  const paths = require('../src/paths');
  withEnv({ TOKENTELEMETRY_BACKEND_PORT: '9100', TOKENTELEMETRY_DASHBOARD_PORT: 'nope' }, () => {
    assert.strictEqual(paths.backendPort(), 9100);
    assert.strictEqual(paths.dashboardPort(), 5173);
  });
});
