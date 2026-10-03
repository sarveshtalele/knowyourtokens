// Bundles the extension into dist/extension.js (vscode stays external). --tests also bundles the
// unit tests (which never import vscode) into dist-test/ for `node --test`.
import { build, context } from 'esbuild';
import { readdirSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const production = args.has('--production');

const extension = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

if (args.has('--tests')) {
  await build({
    entryPoints: readdirSync('test').filter((f) => f.endsWith('.test.ts')).map((f) => `test/${f}`),
    bundle: true,
    outdir: 'dist-test',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'warning',
  });
} else if (args.has('--watch')) {
  const ctx = await context(extension);
  await ctx.watch();
} else {
  await build(extension);
}
