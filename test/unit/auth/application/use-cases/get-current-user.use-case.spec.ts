import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi } from 'vitest';
import { GetCurrentUserUseCase } from '@/auth/application/use-cases/get-current-user.use-case';

describe('GetCurrentUserUseCase', () => {
  it('throws when user missing', async () => {
    const userRepository = { findOne: vi.fn().mockResolvedValue(null) } as any;
    const useCase = new GetCurrentUserUseCase(userRepository);
    await expect(useCase.execute('u1')).rejects.toThrow(UnauthorizedException);
  });

  it('returns mapped user', async () => {
    const userRepository = { findOne: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@a.com', name: 'A', image: null, role: 'USER' }) } as any;
    const useCase = new GetCurrentUserUseCase(userRepository);
    const user = await useCase.execute('u1');
    expect(user).toEqual({ id: 'u1', email: 'a@a.com', name: 'A', image: null, role: 'USER' });
  });
});
