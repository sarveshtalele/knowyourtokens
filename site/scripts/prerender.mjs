// Inject server-rendered HTML into dist/index.html so search engines and
// link previews see the full page content without running JavaScript; add
// FAQ structured data and stamp the sitemap with the build date.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render, faqJsonLd } = await import(join(root, 'dist-ssr', 'entry-server.js'));
const file = join(root, 'dist', 'index.html');
const html = readFileSync(file, 'utf8');
if (!html.includes('<!--app-->')) throw new Error('dist/index.html is missing the <!--app--> placeholder');
writeFileSync(
  file,
  html
    .replace('<!--app-->', render())
    .replace('</head>', `<script type="application/ld+json">${faqJsonLd()}</script>\n  </head>`),
);

const sitemap = join(root, 'dist', 'sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  sitemap,
  readFileSync(sitemap, 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`),
);

// Canonical/OG/sitemap URLs are written for the default Pages address. The Pages workflow sets
// SITE_URL from the repository name, so a renamed repo or a custom domain stays consistent.
const DEFAULT_URL = 'https://sarveshtalele.github.io/knowyourtokens/';
const siteUrl = process.env.SITE_URL;
if (siteUrl && siteUrl !== DEFAULT_URL) {
  for (const f of ['index.html', '404.html', 'sitemap.xml', 'robots.txt']) {
    const p = join(root, 'dist', f);
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll(DEFAULT_URL, siteUrl));
  }
  console.log(`site URL: ${siteUrl}`);
}
// Static files Vite copies verbatim carry the default base path too.
const base = process.env.SITE_BASE;
if (base && base !== '/knowyourtokens/') {
  for (const f of ['404.html', 'site.webmanifest']) {
    const p = join(root, 'dist', f);
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('/knowyourtokens/', base));
  }
}

rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
console.log('prerendered dist/index.html');
