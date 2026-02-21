import { describe, it, expect, vi } from 'vitest';
import { UserPrismaRepositoryAdapter } from '@/infrastructure/prisma/adapters/user-prisma.repository.adapter';
import { OAuthProviderType, UserRole } from '@/shared/domain/user.types';

describe('UserPrismaRepositoryAdapter', () => {
  const prismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oAuthAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  } as any;

  it('supports basic read/write mappings', async () => {
    const adapter = new UserPrismaRepositoryAdapter(prismaService);
    prismaService.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@a.com', name: 'A', image: null, role: 'USER', password: 'h', tokenVersion: 1 });
    const byId = await adapter.findOne('u1');
    expect(byId?.role).toBe(UserRole.USER);

    prismaService.user.create.mockResolvedValue({ id: 'u1', email: 'a@a.com', name: 'A', image: null, role: 'USER', password: 'h', tokenVersion: 1 });
    const created = await adapter.create({ email: 'a@a.com', password: 'h', name: 'A', role: UserRole.USER });
    expect(created.email).toBe('a@a.com');

    prismaService.oAuthAccount.findUnique.mockResolvedValue({ user: { id: 'u2', email: 'b@b.com', name: 'B', image: null, role: 'USER', password: null, tokenVersion: 0 } });
    const oauthUser = await adapter.findByOAuthAccount(OAuthProviderType.GOOGLE, 'pid');
    expect(oauthUser?.id).toBe('u2');

    await adapter.linkOAuthAccount('u1', OAuthProviderType.GITHUB, 'pid2');
    expect(prismaService.oAuthAccount.create).toHaveBeenCalled();
  });
});
