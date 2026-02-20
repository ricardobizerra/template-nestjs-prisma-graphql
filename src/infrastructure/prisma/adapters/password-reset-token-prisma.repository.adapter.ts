import { Injectable } from '@nestjs/common';
import { PasswordResetTokenRepositoryPort } from '@/shared/application/ports/password-reset-token-repository.port';
import { PrismaService } from '@/lib/prisma/prisma.service';

@Injectable()
export class PasswordResetTokenPrismaRepositoryAdapter
  implements PasswordResetTokenRepositoryPort
{
  constructor(private readonly prismaService: PrismaService) {}

  async deleteByUserId(userId: string): Promise<void> {
    await this.prismaService.passwordResetToken.deleteMany({
      where: { userId },
    });
  }

  async create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prismaService.passwordResetToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findValidTokensWithUser(): Promise<
    Array<{
      id: string;
      tokenHash: string;
      userId: string;
      user: { id: string };
    }>
  > {
    const rows = await this.prismaService.passwordResetToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    return rows.map((row) => ({
      id: row.id,
      tokenHash: row.token,
      userId: row.userId,
      user: { id: row.user.id },
    }));
  }

  async deleteById(id: string): Promise<void> {
    await this.prismaService.passwordResetToken.delete({ where: { id } });
  }
}
