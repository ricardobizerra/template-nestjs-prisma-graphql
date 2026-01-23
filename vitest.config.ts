import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    setupFiles: ['./test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    alias: {
      '@': '/src',
    },
    testTimeout: 30000, // 30 seconds timeout for tests
    hookTimeout: 30000, // 30 seconds timeout for hooks
    teardownTimeout: 30000, // 30 seconds timeout for teardown
    environment: 'node',
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/test/**',
        '**/*.module.ts',
        '**/main.ts',
        '**/*.dto.ts',
        '**/*.entity.ts',
        '**/*.interface.ts',
        '**/*.types.ts',
        '**/*.model.ts',
        '**/*.decorator.ts',
        'src/env.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
