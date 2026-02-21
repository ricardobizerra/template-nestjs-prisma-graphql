import { Role } from '@prisma/client';
import { RoleGuard } from '@/auth/role.guard';
import { ExecutionContext } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  const mockRoles = ['ADMIN'] as Role[];

  beforeEach(() => {
    guard = new RoleGuard(mockRoles);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no roles required', () => {
    const emptyGuard = new RoleGuard([]);
    const mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    expect(emptyGuard.canActivate(mockContext)).toBe(true);
  });

  it('should return true if user has required role', () => {
    const mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { role: 'ADMIN' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it("should return false if user doesn't have required role", () => {
    const mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { role: 'USER' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(false);
  });

  it('should return false if no user exists', () => {
    const mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(false);
  });
});
