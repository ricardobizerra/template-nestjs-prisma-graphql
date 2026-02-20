import { OAuthProvider, Role } from '@prisma/client';
import { OAuthProviderType, UserRole } from '@/shared/domain/user.types';

export function toDomainRole(role: Role): UserRole {
  return role === Role.ADMIN ? UserRole.ADMIN : UserRole.USER;
}

export function toPrismaRole(role: UserRole): Role {
  return role === UserRole.ADMIN ? Role.ADMIN : Role.USER;
}

export function toDomainOAuthProvider(
  provider: OAuthProvider,
): OAuthProviderType {
  return provider === OAuthProvider.GITHUB
    ? OAuthProviderType.GITHUB
    : OAuthProviderType.GOOGLE;
}

export function toPrismaOAuthProvider(
  provider: OAuthProviderType,
): OAuthProvider {
  return provider === OAuthProviderType.GITHUB
    ? OAuthProvider.GITHUB
    : OAuthProvider.GOOGLE;
}
