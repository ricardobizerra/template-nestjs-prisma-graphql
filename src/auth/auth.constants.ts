import { OAuthProvider } from '@prisma/client';

/**
 * OAuth providers that are currently implemented and available for connection.
 * Google is always available (mandatory env vars).
 * Other providers are included only if their env vars are configured.
 */
export function getAvailableOAuthProviders(): OAuthProvider[] {
  const providers: OAuthProvider[] = [OAuthProvider.GOOGLE];

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(OAuthProvider.GITHUB);
  }

  return providers;
}

/**
 * Check if a specific optional OAuth provider is configured.
 */
export function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
  switch (provider) {
    case OAuthProvider.GOOGLE:
      return true; // Always configured (mandatory)
    case OAuthProvider.GITHUB:
      return !!(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      );
    default:
      return false;
  }
}
