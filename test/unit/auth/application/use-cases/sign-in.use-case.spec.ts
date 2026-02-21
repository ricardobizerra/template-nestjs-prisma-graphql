import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';

describe('SignInUseCase', () => {
  const userRepository = { findByEmail: vi.fn() } as any;
  const passwordHasher = { compare: vi.fn() } as any;
  const sessionTokenPort = {
    generateAccessToken: vi.fn().mockReturnValue('a'),
    generateRefreshToken: vi.fn().mockReturnValue('r'),
  } as any;
  let useCase: SignInUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionTokenPort.generateAccessToken.mockReturnValue('a');
    sessionTokenPort.generateRefreshToken.mockReturnValue('r');
    useCase = new SignInUseCase(
      userRepository,
      passwordHasher,
      sessionTokenPort,
    );
  });

  it('throws when user not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute('a@a.com', 'x')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws for oauth-only account', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: '1', password: null });
    await expect(useCase.execute('a@a.com', 'x')).rejects.toThrow(
      'OAuth login',
    );
  });

  it('throws for wrong password', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: '1', password: 'h' });
    passwordHasher.compare.mockResolvedValue(false);
    await expect(useCase.execute('a@a.com', 'x')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns tokens and user payload', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'a@a.com',
      name: 'A',
      image: null,
      role: 'USER',
      password: 'h',
    });
    passwordHasher.compare.mockResolvedValue(true);
    const result = await useCase.execute('a@a.com', 'x');
    expect(result.accessToken).toBe('a');
    expect(result.refreshToken).toBe('r');
    expect(result.user.email).toBe('a@a.com');
  });
});
