import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';

describe('RefreshSessionUseCase', () => {
  const sessionTokenPort = {
    verifyRefreshToken: vi.fn(),
    generateAccessToken: vi.fn().mockReturnValue('new-a'),
    generateRefreshToken: vi.fn().mockReturnValue('new-r'),
  } as any;
  const userRepository = { findOne: vi.fn() } as any;
  let useCase: RefreshSessionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionTokenPort.generateAccessToken.mockReturnValue('new-a');
    sessionTokenPort.generateRefreshToken.mockReturnValue('new-r');
    useCase = new RefreshSessionUseCase(sessionTokenPort, userRepository);
  });

  it('rejects wrong token type', async () => {
    sessionTokenPort.verifyRefreshToken.mockReturnValue({ sub: '1', type: 'access' });
    await expect(useCase.execute('t')).rejects.toThrow('Invalid token type');
  });

  it('rejects missing user', async () => {
    sessionTokenPort.verifyRefreshToken.mockReturnValue({ sub: '1', tokenVersion: 0, type: 'refresh' });
    userRepository.findOne.mockResolvedValue(null);
    await expect(useCase.execute('t')).rejects.toThrow('User not found');
  });

  it('rejects revoked token', async () => {
    sessionTokenPort.verifyRefreshToken.mockReturnValue({ sub: '1', tokenVersion: 0, type: 'refresh' });
    userRepository.findOne.mockResolvedValue({ id: '1', tokenVersion: 1 });
    await expect(useCase.execute('t')).rejects.toThrow('Token has been revoked');
  });

  it('returns rotated tokens', async () => {
    sessionTokenPort.verifyRefreshToken.mockReturnValue({ sub: '1', tokenVersion: 1, type: 'refresh' });
    userRepository.findOne.mockResolvedValue({ id: '1', tokenVersion: 1 });
    const result = await useCase.execute('t');
    expect(result).toEqual({ accessToken: 'new-a', refreshToken: 'new-r' });
  });
});
