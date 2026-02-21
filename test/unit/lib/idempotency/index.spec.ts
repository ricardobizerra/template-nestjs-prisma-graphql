import { describe, it, expect } from 'vitest';
import * as idem from '@/lib/idempotency';

describe('idempotency index', () => {
  it('re-exports idempotency symbols', () => {
    expect(idem.IDEMPOTENCY_HEADER).toBeDefined();
    expect(idem.IdempotencyInterceptor).toBeDefined();
  });
});
