import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from '@/shared/application/ports/session-token.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(SESSION_TOKEN_PORT)
    private readonly sessionTokenPort: SessionTokenPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = this.sessionTokenPort.verifyRefreshToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      accessToken: this.sessionTokenPort.generateAccessToken(user),
      refreshToken: this.sessionTokenPort.generateRefreshToken(user),
    };
  }
}
