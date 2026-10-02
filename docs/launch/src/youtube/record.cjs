// Records the YouTube launch + guide video (docs/launch/video/youtube-launch-and-guide-1920x1080.mp4)
// with Playwright + Chromium against the real dashboard.
//
//   1. make demo (or seed + serve the demo data on :8000) and serve the built dashboard on :5173:
//        node cli/src/static-server.js frontend/dist 5173 8000
//   2. node docs/launch/src/youtube/record.cjs            # every segment -> ./segments/*.mp4
//   3. ls segments/*.mp4 | sed "s/^/file '/; s/$/'/" > list.txt
//      ffmpeg -f concat -safe 0 -i list.txt -c copy video.mp4
//
// Each segment is captured with the DevTools screencast (JPEG frames with timestamps) and turned into
// a constant-30fps H.264 clip. Needs ffmpeg and playwright-core (CHROMIUM_PATH to pick a browser).
// RID is the id of a large request in the demo data, shown in the "debug a prompt" chapter.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(process.cwd(), 'segments');
const APP = 'http://127.0.0.1:5173';
const SLIDES = 'file://' + path.join(__dirname, 'slides.html');
const RID = process.env.RID || '216';
const only = process.argv[2]; // record a single segment by name
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cursor + caption overlay injected into every app page.
const OVERLAY = `
(() => {
  if (window.__kyt) return;
  const css = \`
  #kyt-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
    transform:translate(760px,600px);transition:transform 700ms cubic-bezier(.45,0,.2,1);filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))}
  #kyt-ripple{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #7c6cff;
    z-index:2147483646;pointer-events:none;opacity:0}
  #kyt-ripple.go{animation:kytr .55s ease-out}
  @keyframes kytr{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.4)}}
  #kyt-cap{position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);opacity:0;z-index:2147483645;pointer-events:none;
    background:rgba(17,17,24,.92);color:#fff;border-radius:18px;padding:14px 22px 15px;max-width:1100px;
    font:500 19px/1.4 Inter,system-ui,sans-serif;box-shadow:0 24px 60px -24px rgba(0,0,0,.6);transition:all .45s cubic-bezier(.16,1,.3,1);
    display:flex;gap:16px;align-items:center}
  #kyt-cap.on{opacity:1;transform:translate(-50%,0)}
  #kyt-cap b{font:800 15px/1 'JetBrains Mono',ui-monospace,monospace;color:#2dd4bf;letter-spacing:.06em;white-space:nowrap;
    background:rgba(45,212,191,.12);padding:8px 10px;border-radius:9px}
  #kyt-cap strong{color:#fff;font-weight:750;margin-right:8px}
  #kyt-cap span{color:#d5d5e0}
  #kyt-hl{position:fixed;z-index:2147483640;pointer-events:none;border:3px solid #7c6cff;border-radius:14px;opacity:0;
    box-shadow:0 0 0 6px rgba(124,108,255,.18);transition:all .5s cubic-bezier(.16,1,.3,1)}
  #kyt-hl.on{opacity:1}\`;
  const add = () => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const cur = document.createElement('div'); cur.id = 'kyt-cursor';
    cur.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26"><path d="M3 2 L3 21 L8.5 16 L12 24 L15.5 22.5 L12 15 L19.5 15 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const rip = document.createElement('div'); rip.id = 'kyt-ripple';
    const cap = document.createElement('div'); cap.id = 'kyt-cap';
    const hl = document.createElement('div'); hl.id = 'kyt-hl';
    document.body.append(hl, cap, rip, cur);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  window.__kyt = {
    move(x, y, ms) { const c = document.getElementById('kyt-cursor'); c.style.transitionDuration = ms + 'ms'; c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; },
    ripple(x, y) { const r = document.getElementById('kyt-ripple'); r.style.left = x + 'px'; r.style.top = y + 'px'; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); },
    caption(n, title, text) { const c = document.getElementById('kyt-cap');
      if (!title) { c.classList.remove('on'); return; }
      c.innerHTML = '<b>' + n + '</b><div><strong>' + title + '</strong><span>' + text + '</span></div>'; c.classList.add('on'); },
    hl(r) { const h = document.getElementById('kyt-hl'); if (!r) { h.classList.remove('on'); return; }
      Object.assign(h.style, { left: r.x - 8 + 'px', top: r.y - 8 + 'px', width: r.w + 16 + 'px', height: r.h + 16 + 'px' }); h.classList.add('on'); },
    scroller() { const m = [...document.querySelectorAll('main, [class*=overflow-y-auto], [class*=overflow-auto]')].find(e => e.scrollHeight > e.clientHeight + 40);
      return m || document.scrollingElement; },
    scrollBy(dy, ms) { const el = this.scroller(), y0 = el.scrollTop, t0 = performance.now();
      return new Promise(res => { (function f(t){ const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2;
        el.scrollTop = y0 + dy * e; if (k < 1) requestAnimationFrame(f); else res(); })(t0); }); },
  };
})();`;

let cursor = { x: 760, y: 600 };

function helpers(page) {
  const box = async (sel) => {
    const el = typeof sel === 'string' ? page.locator(sel).first() : sel.first();
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const b = await el.boundingBox();
    return b;
  };
  return {
    caption: (n, t, s) => page.evaluate(([n, t, s]) => window.__kyt.caption(n, t, s), [n, t, s]),
    hide: () => page.evaluate(() => window.__kyt.caption()),
    async move(x, y, ms = 800) {
      await page.evaluate(([x, y, ms]) => window.__kyt.move(x, y, ms), [x, y, ms]);
      cursor = { x, y };
      await sleep(ms + 80);
    },
    async moveTo(sel, ms = 800, dx = 0.5, dy = 0.5) {
      const b = await box(sel);
      await this.move(b.x + b.width * dx, b.y + b.height * dy, ms);
      return b;
    },
    async click(sel, ms = 800) {
      const b = await this.moveTo(sel, ms);
      await page.evaluate(([x, y]) => window.__kyt.ripple(x, y), [cursor.x, cursor.y]);
      await sleep(180);
      await page.mouse.click(cursor.x, cursor.y);
      return b;
    },
    async highlight(sel, ms = 0) {
      const b = await box(sel);
      await page.evaluate((r) => window.__kyt.hl(r), { x: b.x, y: b.y, w: b.width, h: b.height });
      if (ms) await sleep(ms);
    },
    unhl: () => page.evaluate(() => window.__kyt.hl()),
    scroll: (dy, ms = 1400) => page.evaluate(([dy, ms]) => window.__kyt.scrollBy(dy, ms), [dy, ms]),
    nav: (label) => page.locator('aside, nav').getByRole('link', { name: label, exact: true }),
  };
}

async function capture(page, name, fn, fadeIn = true) {
  const cdp = await page.context().newCDPSession(page);
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, data });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  await fn();
  const t1 = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await sleep(200);
  // Concat list: each frame lasts until the next one; the first starts at t0, the last runs to t1.
  const fr = frames.filter((f) => f.t <= t1).sort((a, b) => a.t - b.t);
  if (!fr.length) throw new Error(`${name}: no frames`);
  let list = '';
  fr.forEach((f, i) => {
    const file = path.join(dir, `${String(i).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    const start = i === 0 ? t0 : f.t;
    const end = i + 1 < fr.length ? fr[i + 1].t : t1;
    list += `file '${file}'\nduration ${Math.max(0.001, end - start).toFixed(4)}\n`;
  });
  list += `file '${path.join(dir, String(fr.length - 1).padStart(5, '0') + '.jpg')}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  const dur = t1 - t0;
  const vf = [
    'scale=1920:1080:flags=lanczos',
    'fps=30',
    fadeIn ? 'fade=t=in:st=0:d=0.35:color=white' : null,
    `fade=t=out:st=${Math.max(0, dur - 0.3).toFixed(2)}:d=0.3:color=white`,
    'format=yuv420p',
  ].filter(Boolean).join(',');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', '30', '-t', dur.toFixed(2), path.join(OUT, `${name}.mp4`)]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: ${dur.toFixed(1)}s, ${fr.length} frames`);
}

async function slide(browser, name, query, seconds) {
  if (only && only !== name) return;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('about:blank');
  await capture(page, name, async () => {
    await page.goto(`${SLIDES}?${query}`);
    await sleep(seconds * 1000);
  });
  await page.close();
}

async function app(ctx, name, startPath, fn) {
  if (only && only !== name) return;
  const page = await ctx.newPage();
  await page.goto(APP + startPath, { waitUntil: 'networkidle' });
  await sleep(900);
  const h = helpers(page);
  await page.evaluate(([x, y]) => window.__kyt.move(x, y, 0), [cursor.x, cursor.y]);
  await capture(page, name, () => fn(page, h));
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, colorScheme: 'light' });
  await ctx.addInitScript(() => localStorage.setItem('theme', 'light'));
  await ctx.addInitScript(OVERLAY);

  // ---------- Launch ----------
  await slide(browser, '01-hook', 's=hook', 5.6);
  await slide(browser, '02-problem', 's=problem', 5.2);
  await slide(browser, '03-reveal', 's=reveal', 5.6);
  await slide(browser, '04-pillars', 's=pillars', 5.4);

  // ---------- Guide ----------
  await slide(browser, '05-ch-install', 's=chapter&n=GUIDE%20·%2001&t=Install%20in%20one%20command&sub=Then%20everything%20runs%20on%20your%20machine', 2.6);
  await slide(browser, '06-install', 's=install', 9.5);

  await app(ctx, '07-dashboard', '/', async (page, h) => {
    await h.caption('02 · DASHBOARD', 'Your command center.', 'Every token from every agent: totals, daily trend and the token mix.');
    await sleep(1200);
    await h.moveTo('text=Total tokens', 900);
    await h.highlight(page.locator('text=Total tokens').locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), 1600);
    await h.unhl();
    await h.moveTo('text=Token consumption', 900, 0.5, 6);
    await sleep(1400);
    await h.moveTo('text=Token mix', 800, 0.5, 4);
    await h.caption('02 · DASHBOARD', 'Cache reads dominate.', 'Reused context is usually billed at a fraction of fresh input, so this is a healthy mix.');
    await sleep(2600);
    await h.click(page.getByLabel('Date range').first(), 800);
    await sleep(600);
    await page.keyboard.press('Escape');
    await page.getByLabel('Date range').first().selectOption({ index: 2 }).catch(() => {});
    await h.caption('02 · DASHBOARD', 'Any time range.', 'Last 7, 30, 90 or 365 days, or all time. Every card and chart follows the range.');
    await sleep(2000);
    await h.scroll(520, 1600);
    await sleep(1600);
    await h.scroll(-520, 1000);
  });

  await app(ctx, '08-agents', '/', async (page, h) => {
    await h.caption('03 · AGENTS', 'Every agent, side by side.', 'Claude Code, Codex CLI, Gemini CLI, OpenCode and anything you push through the API.');
    await h.click(h.nav('Agents'), 900);
    await sleep(2600);
    await h.scroll(380, 1500);
    await sleep(1800);
  });

  await app(ctx, '09-requests', '/', async (page, h) => {
    await h.caption('04 · REQUESTS', 'Every model request.', 'Exact input, output and cache tokens per request, newest first.');
    await h.click(h.nav('Requests'), 900);
    await sleep(2200);
    const row = page.locator('tbody tr').nth(1);
    await h.click(row, 900);
    await h.caption('04 · REQUESTS', 'Open any request.', 'The side panel shows its tokens, model, agent and a preview of the prompt.');
    await sleep(3000);
  });

  await app(ctx, '10-debug', `/requests/${RID}`, async (page, h) => {
    await h.caption('05 · DEBUG A PROMPT', 'Why did this request use 288K tokens?', 'Know Your Tokens shows exactly where they went.');
    await sleep(1800);
    await h.moveTo('text=Where did these tokens go?', 900);
    await h.highlight(page.locator('text=Where did these tokens go?').locator('xpath=..'), 0);
    await h.caption('05 · DEBUG A PROMPT', 'The breakdown.', 'Most of it was newly cached context, not your question.');
    await sleep(3000);
    await h.unhl();
    await h.scroll(420, 1600);
    await h.caption('05 · DEBUG A PROMPT', 'The full prompt, in order.', 'Here is the culprit: an entire log file pasted into the context. Trim it and the request shrinks.');
    await sleep(3400);
    await h.scroll(700, 2200);
    await sleep(1600);
  });

  await app(ctx, '11-project', '/projects', async (page, h) => {
    await h.caption('06 · PROJECTS', 'Per project hotspots.', 'Which sessions and requests use the most context in each project.');
    await sleep(1600);
    await h.click(page.locator('text=checkout-service').first(), 900);
    await sleep(2400);
    await h.scroll(560, 1800);
    await sleep(2200);
  });

  await app(ctx, '12-tools', '/tools', async (page, h) => {
    await h.caption('07 · TOOLS, SKILLS & MCP', 'What your agent actually does.', 'Every tool call, skill and MCP server, with how often each one runs.');
    await sleep(2600);
    await h.click(h.nav('MCP & Plugins'), 900);
    await sleep(2400);
    await h.click(h.nav('Sessions'), 900);
    await h.caption('07 · SESSIONS', 'Whole conversations.', 'Every conversation with its requests and tokens, per agent and project.');
    await sleep(2600);
  });

  await app(ctx, '13-calculator', '/calculator', async (page, h) => {
    await h.caption('08 · TOKEN CALCULATOR', 'Check before you paste.', 'Estimate any prompt or file offline and see how much of the context window it takes.');
    await sleep(1800);
    await h.click(page.getByRole('button', { name: 'Log excerpt' }), 900);
    await sleep(2200);
    await h.click(page.getByRole('button', { name: 'TypeScript file' }), 800);
    await sleep(2000);
    await h.scroll(420, 1500);
    await h.caption('08 · TOKEN CALCULATOR', 'Price it at your rates.', 'Nothing is built in: enter your own $ per million tokens.');
    await sleep(2600);
  });

  await app(ctx, '14-reports', '/reports', async (page, h) => {
    await h.caption('09 · REPORTS & API', 'Take your data anywhere.', 'CSV, JSON and NDJSON exports, a REST API, Python and TypeScript SDKs.');
    await sleep(2600);
    await h.click(h.nav('About'), 900);
    await h.caption('09 · OPEN SOURCE', 'Exact or estimated, always labelled.', 'Every number says whether it is exact or estimated. Free and MIT licensed.');
    await sleep(2600);
  });

  await slide(browser, '15-ingest', 's=ingest', 6.2);
  await slide(browser, '16-map', 's=map', 6.5);
  await slide(browser, '17-outro', 's=outro', 7.5);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
