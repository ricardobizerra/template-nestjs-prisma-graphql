import { describe, it, expect } from 'vitest';
import { OAuthProvider } from '@prisma/client';
import { getAvailableOAuthProviders, isOAuthProviderConfigured } from '@/auth/auth.constants';

describe('auth.constants', () => {
  it('returns google by default', () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    expect(getAvailableOAuthProviders()).toEqual([OAuthProvider.GOOGLE]);
  });

  it('returns github when configured and checks provider configuration', () => {
    process.env.GITHUB_CLIENT_ID = 'id';
    process.env.GITHUB_CLIENT_SECRET = 'secret';
    expect(getAvailableOAuthProviders()).toContain(OAuthProvider.GITHUB);
    expect(isOAuthProviderConfigured(OAuthProvider.GITHUB)).toBe(true);
  });
});
