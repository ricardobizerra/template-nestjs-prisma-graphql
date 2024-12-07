import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    alias: {
      '@': '/src',
    },
    root: './',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
