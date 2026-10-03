const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

async function withEnvAsync(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    process.env[k] = vars[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

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
  withEnv({ CLAUDE_CONFIG_DIR: dir, KNOWYOURTOKENS_HOME: path.join(dir, 'home') }, () => {
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
    assert.ok(fs.existsSync(`${settings}.bak-knowyourtokens`));

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
  const parent = tmpdir();
  const dir = path.join(parent, 'site');
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(parent, 'secret.txt'), 'TOP-SECRET');
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
    assert.doesNotMatch((await get('/..%2fsecret.txt')).body, /TOP-SECRET/);
    assert.doesNotMatch((await get('/..%5csecret.txt')).body, /TOP-SECRET/);
  } finally {
    server.close();
  }
});

test('ports are configurable and validated', () => {
  const paths = require('../src/paths');
  withEnv({ KNOWYOURTOKENS_BACKEND_PORT: '9100', KNOWYOURTOKENS_DASHBOARD_PORT: 'nope' }, () => {
    assert.strictEqual(paths.backendPort(), 9100);
    assert.strictEqual(paths.dashboardPort(), 5173);
  });
});

test('app shortcut files are well-formed and quote hostile paths', () => {
  const sc = require('../src/shortcut');
  const entry = sc.linuxDesktopEntry('/opt/node $x/bin/node', '/home/a "b"/bin/knowyourtokens.js', '/icons/tt.png');
  assert.match(entry, /^\[Desktop Entry\]\nType=Application/);
  // Spec: \$ inside quotes, then the string escape doubles the backslash.
  assert.ok(entry.includes('Exec="/opt/node \\\\$x/bin/node" "/home/a \\\\"b\\\\"/bin/knowyourtokens.js" start'));
  assert.ok(sc.linuxDesktopEntry('/n', '/100%/t.js', 'i').includes('"/100%%/t.js"'));
  assert.match(entry, /Terminal=false/);
  assert.match(sc.macInfoPlist('9.9.9'), /<key>CFBundleIconFile<\/key><string>icon<\/string>/);
  assert.match(sc.macInfoPlist('9.9.9'), /<string>9\.9\.9<\/string>/);
  const script = sc.macLauncherScript("/usr/bin/node", "/Users/o'neil/cli/bin/knowyourtokens.js", '/tmp/l.log');
  assert.match(script, /^#!\/bin\/sh/);
  assert.match(script, /'\/Users\/o'\\''neil\/cli\/bin\/knowyourtokens.js' start/);
  const ps = sc.windowsShortcutScript('C:\\node.exe', "C:\\Users\\o'neil\\tt.js", 'C:\\i.ico');
  assert.match(ps, /'"C:\\Users\\o''neil\\tt.js" start'/);
  assert.match(ps, /\$s\.WindowStyle = 7/);
});

test('icon assets ship with the package', () => {
  for (const f of ['icon.png', 'icon.ico', 'icon.icns']) {
    const buf = fs.readFileSync(path.join(__dirname, '..', 'assets', f));
    assert.ok(buf.length > 1000, f);
  }
  const ico = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icon.ico'));
  assert.deepStrictEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]);
  assert.strictEqual(fs.readFileSync(path.join(__dirname, '..', 'assets', 'icon.icns')).subarray(0, 4).toString(), 'icns');
});

test('linux shortcut creates a launcher and removes it again', { skip: process.platform !== 'linux' }, () => {
  const home = tmpdir();
  withEnv({ XDG_DATA_HOME: path.join(home, 'share'), HOME: home, KNOWYOURTOKENS_HOME: path.join(home, 'tt') }, () => {
    delete require.cache[require.resolve('../src/shortcut')];
    const sc = require('../src/shortcut');
    const { created } = sc.create();
    const entry = path.join(home, 'share', 'applications', 'knowyourtokens.desktop');
    assert.ok(created.includes(entry));
    assert.match(fs.readFileSync(entry, 'utf8'), /Icon=.*knowyourtokens\.png/);
    assert.ok(fs.existsSync(path.join(home, 'share', 'icons', 'hicolor', '512x512', 'apps', 'knowyourtokens.png')));
    assert.ok(sc.remove().includes(entry));
    assert.ok(!fs.existsSync(entry));
  });
});

test('settings and installs from before the rename keep working', () => {
  const home = tmpdir();
  withEnv({ HOME: home, USERPROFILE: home, KNOWYOURTOKENS_HOME: '', TOKENTELEMETRY_BACKEND_PORT: '9100' }, () => {
    delete require.cache[require.resolve('../src/paths')];
    const paths = require('../src/paths');
    assert.strictEqual(paths.backendPort(), 9100, 'legacy TOKENTELEMETRY_* env is honoured');
    assert.strictEqual(paths.installDir(), path.join(home, '.knowyourtokens'), 'fresh machine uses the new dir');
    fs.mkdirSync(path.join(home, '.tokentelemetry'));
    assert.strictEqual(paths.installDir(), path.join(home, '.tokentelemetry'), 'an old install is reused');
    fs.mkdirSync(path.join(home, '.knowyourtokens'));
    assert.strictEqual(paths.installDir(), path.join(home, '.knowyourtokens'), 'the new dir wins once it exists');
  });
});

test('linux shortcut also removes a launcher left by the old name', { skip: process.platform !== 'linux' }, () => {
  const home = tmpdir();
  withEnv({ XDG_DATA_HOME: path.join(home, 'share'), HOME: home, KNOWYOURTOKENS_HOME: path.join(home, 'kyt') }, () => {
    const old = path.join(home, 'share', 'applications', 'tokentelemetry.desktop');
    fs.mkdirSync(path.dirname(old), { recursive: true });
    fs.writeFileSync(old, '[Desktop Entry]\n');
    delete require.cache[require.resolve('../src/shortcut')];
    const sc = require('../src/shortcut');
    sc.create();
    assert.ok(!fs.existsSync(old));
    sc.remove();
  });
});

function fresh(mod) {
  for (const m of ['paths', 'migrate', 'run', 'install', 'errors', 'uv', 'prompt']) {
    delete require.cache[require.resolve(`../src/${m}`)];
  }
  return require(`../src/${mod}`);
}

test('database location: env > new default > pre-2.4 location until it is moved', () => {
  const home = tmpdir();
  withEnv({ HOME: home, USERPROFILE: home, KNOWYOURTOKENS_HOME: '', KNOWYOURTOKENS_DB: '', CLAUDE_TELEMETRY_DB: '', CLAUDE_CONFIG_DIR: '' }, () => {
    const paths = fresh('paths');
    const fresh_ = path.join(home, '.knowyourtokens', 'data', 'knowyourtokens.db');
    assert.strictEqual(paths.dbPath(), fresh_, 'new installs keep data in the app folder');
    const legacy = path.join(home, '.claude', 'telemetry', 'telemetry.db');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, 'x');
    assert.strictEqual(paths.dbPath(), legacy, 'an un-migrated database keeps being used');
    process.env.CLAUDE_TELEMETRY_DB = '/tmp/old-name.db';
    assert.strictEqual(paths.dbPath(), '/tmp/old-name.db', 'the old env var still pins the path');
    process.env.KNOWYOURTOKENS_DB = '/tmp/new-name.db';
    assert.strictEqual(paths.dbPath(), '/tmp/new-name.db', 'KNOWYOURTOKENS_DB wins');
  });
});

test('migration moves ~/.tokentelemetry and the old database, leaving a link behind', () => {
  const home = tmpdir();
  withEnv({ HOME: home, USERPROFILE: home, KNOWYOURTOKENS_HOME: '', TOKENTELEMETRY_HOME: '', KNOWYOURTOKENS_DB: '', CLAUDE_TELEMETRY_DB: '', CLAUDE_CONFIG_DIR: '' }, () => {
    const legacyDir = path.join(home, '.tokentelemetry');
    fs.mkdirSync(path.join(legacyDir, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'VERSION'), '2.2.0\n');
    const oldDb = path.join(home, '.claude', 'telemetry', 'telemetry.db');
    fs.mkdirSync(path.dirname(oldDb), { recursive: true });
    fs.writeFileSync(oldDb, 'db');
    fs.writeFileSync(`${oldDb}-wal`, 'wal');
    fs.writeFileSync(path.join(path.dirname(oldDb), 'hook-errors.log'), 'err');
    const migrate = fresh('migrate');
    const paths = require('../src/paths');
    const quiet = () => {};
    assert.strictEqual(migrate.migrateInstallDir(quiet), true);
    const current = path.join(home, '.knowyourtokens');
    assert.strictEqual(fs.readFileSync(path.join(current, 'VERSION'), 'utf8'), '2.2.0\n');
    assert.ok(fs.lstatSync(legacyDir).isSymbolicLink(), 'old launchers keep resolving');
    assert.strictEqual(paths.installDir(), current);
    assert.strictEqual(migrate.migrateInstallDir(quiet), false, 'idempotent');

    assert.strictEqual(migrate.migrateDatabase(quiet), true);
    const newDb = path.join(current, 'data', 'knowyourtokens.db');
    assert.strictEqual(fs.readFileSync(newDb, 'utf8'), 'db');
    assert.strictEqual(fs.readFileSync(`${newDb}-wal`, 'utf8'), 'wal', 'the WAL moves with its database');
    assert.ok(fs.existsSync(path.join(current, 'data', 'hook-errors.log')));
    assert.ok(!fs.existsSync(oldDb));
    assert.strictEqual(paths.dbPath(), newDb);
    assert.strictEqual(migrate.migrateDatabase(quiet), false, 'idempotent');
  });
});

test('database migration rolls back when a file cannot move', () => {
  const home = tmpdir();
  withEnv({ HOME: home, USERPROFILE: home, KNOWYOURTOKENS_HOME: path.join(home, 'kyt'), KNOWYOURTOKENS_DB: '', CLAUDE_TELEMETRY_DB: '', CLAUDE_CONFIG_DIR: '' }, () => {
    const oldDb = path.join(home, '.claude', 'telemetry', 'telemetry.db');
    fs.mkdirSync(path.dirname(oldDb), { recursive: true });
    fs.writeFileSync(oldDb, 'db');
    fs.writeFileSync(`${oldDb}-wal`, 'wal');
    const migrate = fresh('migrate');
    // A directory squatting on the target's -wal name makes the second rename fail.
    const target = path.join(home, 'kyt', 'data', 'knowyourtokens.db');
    fs.mkdirSync(`${target}-wal`, { recursive: true });
    fs.writeFileSync(path.join(`${target}-wal`, 'x'), 'x');
    const lines = [];
    assert.strictEqual(migrate.migrateDatabase((l) => lines.push(l)), false);
    assert.strictEqual(fs.readFileSync(oldDb, 'utf8'), 'db', 'the database went back where it was');
    assert.ok(!fs.existsSync(target));
    assert.match(lines.join('\n'), /Kept your data/);
  });
});

test('ports: env pins, ports.json remembers a fallback, defaults otherwise', () => {
  const home = tmpdir();
  withEnv({ KNOWYOURTOKENS_HOME: home, KNOWYOURTOKENS_BACKEND_PORT: '', TOKENTELEMETRY_BACKEND_PORT: '', KNOWYOURTOKENS_DASHBOARD_PORT: '' }, () => {
    const paths = fresh('paths');
    assert.strictEqual(paths.backendPort(), 8000);
    paths.savePorts({ backend: 8123 });
    assert.strictEqual(paths.backendPort(), 8123);
    assert.strictEqual(paths.dashboardPort(), 5173);
    process.env.KNOWYOURTOKENS_BACKEND_PORT = '9001';
    assert.strictEqual(paths.backendPort(), 9001);
    assert.ok(paths.portFromEnv('BACKEND_PORT'));
  });
});

test('start falls back to the next free port when the default is taken', async () => {
  const home = tmpdir();
  const blocker = http.createServer();
  await new Promise((r) => blocker.listen(0, '127.0.0.1', r));
  const taken = blocker.address().port;
  try {
    await withEnvAsync({ KNOWYOURTOKENS_HOME: home, KNOWYOURTOKENS_BACKEND_PORT: '' }, async () => {
      const run = fresh('run');
      const paths = require('../src/paths');
      const chosen = await run.choosePort('backend', taken, 'BACKEND_PORT');
      assert.ok(fs.existsSync(path.join(home, 'ports.json')), 'written to the test home, not the real one');
      assert.ok(chosen > taken && chosen <= taken + 50);
      assert.strictEqual(paths.savedPorts().backend, chosen, 'remembered for status/doctor/extension');
      process.env.KNOWYOURTOKENS_BACKEND_PORT = String(taken);
      assert.strictEqual(await run.choosePort('backend', taken, 'BACKEND_PORT'), null, 'a pinned port is never swapped');
    });
  } finally {
    blocker.close();
  }
});

test('startup failures are explained from the log', () => {
  const run = fresh('run');
  assert.match(run.diagnose('OSError: [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions', { port: 8000 }).join(' '), /Windows blocked port 8000/);
  assert.match(run.diagnose("ModuleNotFoundError: No module named 'fastapi'").join(' '), /knowyourtokens install/);
  assert.match(run.diagnose('sqlite3.OperationalError: database is locked').join(' '), /locked/);
  assert.match(run.diagnose('', { alive: true }).join(' '), /firewall/);
});

test('errors are reported with a fix', () => {
  const errors = fresh('errors');
  const lines = [];
  errors.report(Object.assign(new Error('spawn uv ENOENT'), { code: 'ENOENT', syscall: 'spawn uv', path: 'uv' }), (l) => lines.push(l));
  const out = lines.join('\n');
  assert.match(out, /"uv" isn't installed/);
  assert.match(out, /How to fix it/);
  assert.match(out, /#troubleshooting/);
  const kyt = new errors.KytError('Python 3.10 or newer was not found.', { hint: ['a', 'b'] });
  assert.deepStrictEqual(errors.explain(kyt), { message: 'Python 3.10 or newer was not found.', hint: ['a', 'b'] });
});

test('questions never block a non-interactive run', async () => {
  const prompt = fresh('prompt');
  assert.strictEqual(await prompt.confirm('Install uv now?', { fallback: false }), false);
  assert.strictEqual(await prompt.confirm('Install uv now?', { fallback: true }), true);
});

test('uv is looked for where its installer puts it', () => {
  const uv = fresh('uv');
  const locs = uv.candidateLocations({ UV_INSTALL_DIR: '/opt/uvx' }, '/home/me');
  assert.ok(locs.some((l) => l.startsWith(path.join('/opt/uvx'))));
  assert.ok(locs.includes(path.join('/home/me', '.local', 'bin', process.platform === 'win32' ? 'uv.exe' : 'uv')));
});

test('uninstall --purge keeps the data folder unless --delete-data', () => {
  const home = tmpdir();
  const appDir = path.join(home, 'kyt');
  withEnv({ HOME: home, USERPROFILE: home, KNOWYOURTOKENS_HOME: appDir, KNOWYOURTOKENS_DB: '', CLAUDE_TELEMETRY_DB: '', CLAUDE_CONFIG_DIR: path.join(home, '.claude'), XDG_DATA_HOME: path.join(home, 'share'), XDG_CONFIG_HOME: path.join(home, 'config') }, () => {
    fs.mkdirSync(path.join(appDir, 'data'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'backend'), { recursive: true });
    fs.writeFileSync(path.join(appDir, 'data', 'knowyourtokens.db'), 'db');
    const install = fresh('install');
    const logs = [];
    const orig = console.log;
    console.log = (m) => logs.push(m);
    try {
      install.uninstall({ purge: true, deleteDb: false });
    } finally {
      console.log = orig;
    }
    assert.ok(fs.existsSync(path.join(appDir, 'data', 'knowyourtokens.db')), 'data survives --purge');
    assert.ok(!fs.existsSync(path.join(appDir, 'backend')), 'app files are removed');
    console.log = () => {};
    try {
      install.uninstall({ purge: true, deleteDb: true });
    } finally {
      console.log = orig;
    }
    assert.ok(!fs.existsSync(appDir), '--delete-data removes everything');
  });
});

test(
  'a failed uv download falls back to the system Python, and fails clearly without one',
  // A fake python3 needs a shebang script; on Windows the installer looks for py.exe/python.exe.
  { skip: process.platform === 'win32' },
  async () => {
    const uv = fresh('uv');
    uv.findUv = () => null;
    uv.installUv = () => {
      throw new (require('../src/errors').KytError)("uv couldn't be installed automatically.");
    };
    const { pythonToolchain } = require('../src/install');
    const fakeBin = tmpdir();
    fs.writeFileSync(path.join(fakeBin, 'python3'), '#!/bin/sh\necho True\n', { mode: 0o755 });
    await withEnvAsync({ PATH: fakeBin, KNOWYOURTOKENS_INSTALL_UV: '' }, async () => {
      const choice = await pythonToolchain({ yes: true });
      assert.deepStrictEqual(choice, { python: { cmd: 'python3', baseArgs: [] } });
    });
    await withEnvAsync({ PATH: tmpdir(), KNOWYOURTOKENS_INSTALL_UV: '' }, async () => {
      await assert.rejects(pythonToolchain({ yes: true }), /uv couldn't be installed/);
    });
  },
);
