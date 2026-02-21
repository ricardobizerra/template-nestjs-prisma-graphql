import { describe, it, expect } from 'vitest';
import * as filters from '@/lib/filters';

describe('filters index', () => {
  it('re-exports filter classes', () => {
    expect(filters.HttpExceptionFilter).toBeDefined();
    expect(filters.PrismaExceptionFilter).toBeDefined();
  });
});
