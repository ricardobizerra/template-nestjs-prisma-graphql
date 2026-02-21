import { AuthGuard } from '@/auth/auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return request from http context', () => {
    const mockRequest = { user: { id: '1' } };
    const mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    const result = guard.getRequest(mockContext);
    expect(result).toBe(mockRequest);
    expect(mockContext.switchToHttp).toHaveBeenCalled();
  });
});
