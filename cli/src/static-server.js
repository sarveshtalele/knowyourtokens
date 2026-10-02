// Minimal static file server for the built dashboard, with SPA fallback and
// /api + /ws reverse proxies to the FastAPI backend (the production
// equivalent of frontend/vite.config.ts's dev proxy).
// Usage: node static-server.js <dir> <port> [backendPort]
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { env } = require('./paths');

const dir = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 5173);
const backendPort = Number(process.argv[4] || 8000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
for (const h of (env('ALLOWED_HOSTS') || '').split(',')) {
  if (h.trim()) LOCAL_HOSTS.add(h.trim().toLowerCase());
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    // Recharts and inline theme bootstrapping use style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
};

function hostAllowed(hostHeader) {
  const host = String(hostHeader || '').toLowerCase();
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.replace(/:\d+$/, '');
  return LOCAL_HOSTS.has(name);
}

function proxyToBackend(req, res) {
  // Host is rewritten: the backend's own allowlist sees 127.0.0.1, so this
  // server must enforce the allowlist itself (done in the request handler).
  const headers = { ...req.headers, host: `127.0.0.1:${backendPort}` };
  const proxyReq = http.request(
    { host: '127.0.0.1', port: backendPort, path: req.url, method: req.method, headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', (err) => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'backend_unreachable', message: `Backend unreachable: ${err.message}` } }));
  });
  req.pipe(proxyReq);
}

function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    return res.end('Bad request');
  }
  let filePath = path.normalize(path.join(dir, urlPath));
  // Path-boundary check: a bare startsWith(dir) would accept "<dir>-evil".
  if (filePath !== dir && !filePath.startsWith(dir + path.sep)) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end('Forbidden');
  }
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    stat = null;
  }
  const isAsset = /\/assets\//.test(urlPath);
  if (!stat || stat.isDirectory()) {
    if (isAsset || path.extname(urlPath)) {
      res.writeHead(404, SECURITY_HEADERS);
      return res.end('Not found');
    }
    filePath = path.join(dir, 'index.html'); // SPA route
  }
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
    // Vite fingerprints assets; index.html (and the service worker) must always be revalidated.
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...(urlPath === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}),
  };
  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(200, headers);
    stream.pipe(res);
  });
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500, SECURITY_HEADERS);
    res.end('Internal error');
  });
}

const server = http.createServer((req, res) => {
  if (!hostAllowed(req.headers.host)) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end('Host not allowed');
  }
  if ((req.url || '/').startsWith('/api/') || req.url === '/health' || req.url === '/openapi.json' || (req.url || '').startsWith('/docs')) {
    return proxyToBackend(req, res);
  }
  return serveStatic(req, res);
});

// WebSocket upgrades arrive as 'upgrade', not 'request': replay the handshake
// over a raw TCP socket to the backend.
server.on('upgrade', (req, clientSocket, head) => {
  if (!(req.url || '').startsWith('/ws') || !hostAllowed(req.headers.host)) {
    clientSocket.destroy();
    return;
  }
  const backendSocket = net.connect(backendPort, '127.0.0.1', () => {
    const headers = { ...req.headers, host: `127.0.0.1:${backendPort}` };
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n');
    backendSocket.write(`${req.method} ${req.url} HTTP/1.1\r\n${headerLines}\r\n\r\n`);
    if (head && head.length) backendSocket.write(head);
    clientSocket.pipe(backendSocket);
    backendSocket.pipe(clientSocket);
  });
  backendSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => backendSocket.destroy());
});

if (require.main === module) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`Dashboard on http://127.0.0.1:${port} (proxying /api and /ws to 127.0.0.1:${backendPort})`);
  });
}

module.exports = { server, hostAllowed };
