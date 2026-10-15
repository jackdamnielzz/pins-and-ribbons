/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Preact JSX without an extra Vite plugin.
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
