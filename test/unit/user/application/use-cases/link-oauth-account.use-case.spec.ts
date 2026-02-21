import { describe, it, expect, vi } from 'vitest';
import { LinkOAuthAccountUseCase } from '@/user/application/use-cases/link-oauth-account.use-case';
import { OAuthProviderType } from '@/shared/domain/user.types';

describe('LinkOAuthAccountUseCase', () => {
  it('delegates to repository', async () => {
    const userRepository = { linkOAuthAccount: vi.fn() } as any;
    const useCase = new LinkOAuthAccountUseCase(userRepository);
    await useCase.execute('u1', OAuthProviderType.GITHUB, 'pid');
    expect(userRepository.linkOAuthAccount).toHaveBeenCalledWith('u1', OAuthProviderType.GITHUB, 'pid');
  });
});
