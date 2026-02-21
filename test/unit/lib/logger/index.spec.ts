import { describe, it, expect } from 'vitest';
import * as logger from '@/lib/logger';

describe('logger index', () => {
  it('re-exports logger module and interceptor', () => {
    expect(logger.AppLoggerModule).toBeDefined();
    expect(logger.LoggingInterceptor).toBeDefined();
  });
});
