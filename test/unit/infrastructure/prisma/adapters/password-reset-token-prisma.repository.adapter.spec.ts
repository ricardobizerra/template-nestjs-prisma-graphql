import { describe, it, expect, vi } from 'vitest';
import { PasswordResetTokenPrismaRepositoryAdapter } from '@/infrastructure/prisma/adapters/password-reset-token-prisma.repository.adapter';

describe('PasswordResetTokenPrismaRepositoryAdapter', () => {
  const prismaService = {
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  } as any;

  it('maps operations to prisma model', async () => {
    const adapter = new PasswordResetTokenPrismaRepositoryAdapter(
      prismaService,
    );
    await adapter.deleteByUserId('u1');
    await adapter.create({
      tokenHash: 'h',
      userId: 'u1',
      expiresAt: new Date('2026-01-01'),
    });
    prismaService.passwordResetToken.findMany.mockResolvedValue([
      { id: 't1', token: 'h', userId: 'u1', user: { id: 'u1' } },
    ]);
    const rows = await adapter.findValidTokensWithUser();
    await adapter.deleteById('t1');

    expect(prismaService.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prismaService.passwordResetToken.create).toHaveBeenCalled();
    expect(rows[0]).toEqual({
      id: 't1',
      tokenHash: 'h',
      userId: 'u1',
      user: { id: 'u1' },
    });
    expect(prismaService.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: 't1' },
    });
  });
});
