import { Injectable, BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { randomBytes } from 'crypto';
import { HashingService } from '@/lib/hashing/hashing.service';
import { UserService } from '@/user/user.service';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import * as schema from '@/lib/drizzle/schema';
import { eq, gt, sql } from 'drizzle-orm';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly drizzleService: DrizzleService,
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
    await this.drizzleService.db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.userId, user.id));

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Hash token before storing (security best practice)
    const tokenHash = await this.hashingService.hash(token, 10);

    // Create hashed token with 1 hour expiration
    await this.drizzleService.db.insert(schema.passwordResetTokens).values({
      token: tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Queue email job with unhashed token
    await this.emailQueue.add('password-reset', {
      email: user.email,
      token,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find all non-expired tokens and compare hashes
    const tokens = await this.drizzleService.db
      .select()
      .from(schema.passwordResetTokens)
      .where(gt(schema.passwordResetTokens.expiresAt, new Date()));

    let resetToken = null;
    for (const t of tokens) {
      // Assuming hashingService.compare is used correctly here.
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
    await this.drizzleService.db
      .update(schema.users)
      .set({
        password: hashedPassword,
        tokenVersion: sql`${schema.users.tokenVersion} + 1`, // Revoke all refresh tokens
      })
      .where(eq(schema.users.id, resetToken.userId));

    // Delete used token
    await this.drizzleService.db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.id, resetToken.id));
  }
}
