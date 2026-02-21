import { describe, it, expect } from 'vitest';
import { OAuthProvider, Role } from '@prisma/client';
import { toDomainOAuthProvider, toDomainRole, toPrismaOAuthProvider, toPrismaRole } from '@/shared/infrastructure/mappers/user-enum.mapper';
import { OAuthProviderType, UserRole } from '@/shared/domain/user.types';

describe('user-enum.mapper', () => {
  it('maps roles both directions', () => {
    expect(toDomainRole(Role.ADMIN)).toBe(UserRole.ADMIN);
    expect(toPrismaRole(UserRole.USER)).toBe(Role.USER);
  });

  it('maps oauth providers both directions', () => {
    expect(toDomainOAuthProvider(OAuthProvider.GITHUB)).toBe(OAuthProviderType.GITHUB);
    expect(toPrismaOAuthProvider(OAuthProviderType.GOOGLE)).toBe(OAuthProvider.GOOGLE);
  });
});
