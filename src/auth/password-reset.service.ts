import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomBytes } from 'crypto';
import { HashingService } from '@/lib/hashing/hashing.service';
import { UserService } from '@/user/user.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UserService,
    private readonly hashingService: HashingService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Don't reveal if user exists or not
    if (!user) {
      return;
    }

    // OAuth-only users can't reset password
    if (!user.password) {
      return;
    }

    // Delete any existing tokens for this user
    await this.prismaService.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Hash token before storing (security best practice)
    const tokenHash = await this.hashingService.hash(token, 10);

    // Create hashed token with 1 hour expiration
    await this.prismaService.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Queue email job with unhashed token
    await this.emailQueue.add('password-reset', {
      email: user.email,
      token,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find all non-expired tokens and compare hashes
    const tokens = await this.prismaService.passwordResetToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let resetToken = null;
    for (const t of tokens) {
      if (await this.hashingService.compare(token, t.token)) {
        resetToken = t;
        break;
      }
    }

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await this.hashingService.hash(newPassword, 10);

    // Update user password and revoke all refresh tokens
    await this.prismaService.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 }, // Revoke all refresh tokens
      },
    });

    // Delete used token
    await this.prismaService.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
  }
}
