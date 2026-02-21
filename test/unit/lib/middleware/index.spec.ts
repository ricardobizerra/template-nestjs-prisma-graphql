import { describe, it, expect } from 'vitest';
import * as middleware from '@/lib/middleware';

describe('middleware index', () => {
  it('re-exports requestIdHook', () => {
    expect(middleware.requestIdHook).toBeDefined();
  });
});
