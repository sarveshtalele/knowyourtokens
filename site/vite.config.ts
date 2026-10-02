import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://<user>.github.io/knowyourtokens/ -- override with SITE_BASE for a custom domain.
export default defineConfig({
  base: process.env.SITE_BASE ?? '/knowyourtokens/',
  plugins: [react()],
});
