/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const backend = `http://127.0.0.1:${process.env.TOKENTELEMETRY_BACKEND_PORT || 8000}`;
export default defineConfig({
    plugins: [react()],
    server: {
        host: '127.0.0.1',
        port: Number(process.env.TOKENTELEMETRY_DASHBOARD_PORT || 5173),
        proxy: {
            '/api': backend,
            '/ws': { target: backend.replace('http', 'ws'), ws: true },
        },
    },
    build: {
        rolldownOptions: {
            output: {
                advancedChunks: {
                    groups: [
                        { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor)/ },
                        { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)/ },
                    ],
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
