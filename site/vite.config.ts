import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Served from https://<user>.github.io/knowyourtokens/ -- override with SITE_BASE for a custom domain.
export default defineConfig({
  base: process.env.SITE_BASE ?? '/knowyourtokens/',
  // Kept in step with every package by scripts/bump-version.mjs.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react()],
});
