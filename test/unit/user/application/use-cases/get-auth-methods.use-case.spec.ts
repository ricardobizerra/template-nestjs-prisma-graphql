import { describe, it, expect, vi } from 'vitest';
import { GetAuthMethodsUseCase } from '@/user/application/use-cases/get-auth-methods.use-case';

describe('GetAuthMethodsUseCase', () => {
  it('delegates to repository', async () => {
    const userRepository = { getAuthMethods: vi.fn().mockResolvedValue({ hasPassword: true }) } as any;
    const useCase = new GetAuthMethodsUseCase(userRepository);
    const result = await useCase.execute('u1');
    expect(result.hasPassword).toBe(true);
  });
});
