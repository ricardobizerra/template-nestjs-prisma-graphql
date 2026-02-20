import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
export class ResetPasswordUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY_PORT)
    private readonly resetTokenRepository: PasswordResetTokenRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const resetTokens =
      await this.resetTokenRepository.findValidTokensWithUser();

    let matchedToken: { id: string; tokenHash: string; userId: string } | null =
      null;

    for (const candidate of resetTokens) {
      const isMatch = await this.passwordHasher.compare(
        token,
        candidate.tokenHash,
      );

      if (isMatch) {
        matchedToken = candidate;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword);

    await this.userRepository.updatePasswordAndRevokeSessions(
      matchedToken.userId,
      hashedPassword,
    );

    await this.resetTokenRepository.deleteById(matchedToken.id);
  }
}
