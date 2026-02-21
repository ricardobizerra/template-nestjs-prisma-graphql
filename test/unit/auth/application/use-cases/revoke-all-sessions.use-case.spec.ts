import { describe, it, expect, vi } from 'vitest';
import { RevokeAllSessionsUseCase } from '@/auth/application/use-cases/revoke-all-sessions.use-case';

describe('RevokeAllSessionsUseCase', () => {
  it('increments token version', async () => {
    const userRepository = { incrementTokenVersion: vi.fn() } as any;
    const useCase = new RevokeAllSessionsUseCase(userRepository);
    await useCase.execute('u1');
    expect(userRepository.incrementTokenVersion).toHaveBeenCalledWith('u1');
  });
});
