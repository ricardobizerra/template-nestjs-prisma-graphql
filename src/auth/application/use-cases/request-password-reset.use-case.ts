import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  MAIL_QUEUE_PORT,
  MailQueuePort,
} from '@/shared/application/ports/mail-queue.port';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '@/shared/application/ports/password-hasher.port';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY_PORT,
  PasswordResetTokenRepositoryPort,
} from '@/shared/application/ports/password-reset-token-repository.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY_PORT)
    private readonly resetTokenRepository: PasswordResetTokenRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(MAIL_QUEUE_PORT)
    private readonly mailQueue: MailQueuePort,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.password) {
      return;
    }

    await this.resetTokenRepository.deleteByUserId(user.id);

    const token = randomBytes(32).toString('hex');
    const tokenHash = await this.passwordHasher.hash(token);

    await this.resetTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await this.mailQueue.enqueuePasswordReset({
      email: user.email,
      token,
    });
  }
}
