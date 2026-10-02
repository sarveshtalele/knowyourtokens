// Inject server-rendered HTML into dist/index.html so search engines and
// link previews see the full page content without running JavaScript.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render } = await import(join(root, 'dist-ssr', 'entry-server.js'));
const file = join(root, 'dist', 'index.html');
const html = readFileSync(file, 'utf8');
if (!html.includes('<!--app-->')) throw new Error('dist/index.html is missing the <!--app--> placeholder');
writeFileSync(file, html.replace('<!--app-->', render()));
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
console.log('prerendered dist/index.html');
