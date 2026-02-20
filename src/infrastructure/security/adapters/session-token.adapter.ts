import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  RefreshTokenPayload,
  SessionTokenPort,
} from '@/shared/application/ports/session-token.port';
import {
  CONFIG_PORT,
  ConfigPort,
} from '@/shared/application/ports/config.port';
import { UserRecord } from '@/shared/domain/user.types';

@Injectable()
export class JwtSessionTokenAdapter implements SessionTokenPort {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CONFIG_PORT)
    private readonly configPort: ConfigPort,
  ) {}

  generateAccessToken(user: UserRecord): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  generateRefreshToken(user: UserRecord): string {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.configPort.getRefreshTokenSecret(),
      expiresIn: `${this.configPort.getRefreshTokenExpiresInDays()}d`,
    });
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configPort.getRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
