import { describe, it, expect, vi } from 'vitest';
import { UpdateProfileUseCase } from '@/user/application/use-cases/update-profile.use-case';

describe('UpdateProfileUseCase', () => {
  it('delegates to repository', async () => {
    const userRepository = {
      update: vi.fn().mockResolvedValue({ id: 'u1', name: 'N' }),
    } as any;
    const useCase = new UpdateProfileUseCase(userRepository);
    const user = await useCase.execute('u1', { name: 'N' });
    expect(user.name).toBe('N');
  });
});
