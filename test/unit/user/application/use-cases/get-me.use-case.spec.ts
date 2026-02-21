import { describe, it, expect, vi } from 'vitest';
import { GetMeUseCase } from '@/user/application/use-cases/get-me.use-case';

describe('GetMeUseCase', () => {
  it('delegates to repository', async () => {
    const userRepository = { findOne: vi.fn().mockResolvedValue({ id: 'u1' }) } as any;
    const useCase = new GetMeUseCase(userRepository);
    const user = await useCase.execute('u1');
    expect(user.id).toBe('u1');
  });
});
