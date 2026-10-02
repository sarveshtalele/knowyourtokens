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
writeFileSync(sitemap, readFileSync(sitemap, 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`));

rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
console.log('prerendered dist/index.html');
