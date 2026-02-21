import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuthSignInUseCase } from '@/auth/application/use-cases/oauth-sign-in.use-case';
import { OAuthProviderType } from '@/shared/domain/user.types';

describe('OAuthSignInUseCase', () => {
  const userRepository = {
    findByOAuthAccount: vi.fn(),
    findByEmail: vi.fn(),
    linkOAuthAccount: vi.fn(),
    createWithOAuth: vi.fn(),
  } as any;
  let useCase: OAuthSignInUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new OAuthSignInUseCase(userRepository);
  });

  const input = {
    provider: OAuthProviderType.GOOGLE,
    providerId: 'pid',
    email: 'a@a.com',
    name: 'A',
  };

  it('returns existing oauth user', async () => {
    userRepository.findByOAuthAccount.mockResolvedValue({ id: 'u1' });
    const user = await useCase.execute(input);
    expect(user.id).toBe('u1');
  });

  it('links provider to existing email user', async () => {
    userRepository.findByOAuthAccount.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue({ id: 'u2' });
    const user = await useCase.execute(input);
    expect(userRepository.linkOAuthAccount).toHaveBeenCalledWith('u2', input.provider, input.providerId);
    expect(user.id).toBe('u2');
  });

  it('creates new oauth user', async () => {
    userRepository.findByOAuthAccount.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.createWithOAuth.mockResolvedValue({ id: 'u3' });
    const user = await useCase.execute(input);
    expect(user.id).toBe('u3');
  });
});
