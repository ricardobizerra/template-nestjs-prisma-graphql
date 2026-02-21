import { describe, it, expect } from 'vitest';
import viteConfig from '../../../vitest.config';
import viteE2EConfig from '../../../vitest.config.e2e';
import eslintConfig from '../../../.eslintrc';

describe('tooling config files', () => {
  it('exports vitest and eslint config objects', () => {
    expect(viteConfig).toBeDefined();
    expect(viteE2EConfig).toBeDefined();
    expect(eslintConfig).toBeDefined();
  });
});
