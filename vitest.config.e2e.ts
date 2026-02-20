import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.e2e-spec.ts'],
    globals: true,
    setupFiles: ['./test/setup.ts'],
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
