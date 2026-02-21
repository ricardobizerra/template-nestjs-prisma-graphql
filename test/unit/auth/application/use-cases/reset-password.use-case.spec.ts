import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  const resetTokenRepository = { findValidTokensWithUser: vi.fn(), deleteById: vi.fn() } as any;
  const passwordHasher = { compare: vi.fn(), hash: vi.fn().mockResolvedValue('new-h') } as any;
  const userRepository = { updatePasswordAndRevokeSessions: vi.fn() } as any;
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordHasher.hash.mockResolvedValue('new-h');
    useCase = new ResetPasswordUseCase(resetTokenRepository, passwordHasher, userRepository);
  });

  it('throws when token does not match', async () => {
    resetTokenRepository.findValidTokensWithUser.mockResolvedValue([{ id: 't1', tokenHash: 'h1', userId: '1', user: { id: '1' } }]);
    passwordHasher.compare.mockResolvedValue(false);
    await expect(useCase.execute('plain', 'new')).rejects.toThrow(BadRequestException);
  });

  it('updates password and deletes token on match', async () => {
    resetTokenRepository.findValidTokensWithUser.mockResolvedValue([{ id: 't1', tokenHash: 'h1', userId: '1', user: { id: '1' } }]);
    passwordHasher.compare.mockResolvedValue(true);
    await useCase.execute('plain', 'new');
    expect(userRepository.updatePasswordAndRevokeSessions).toHaveBeenCalledWith('1', 'new-h');
    expect(resetTokenRepository.deleteById).toHaveBeenCalledWith('t1');
  });
});
