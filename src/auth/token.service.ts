import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { UserModel } from '@/user/models/user.model';
import { Env } from '@/env';
import { UserService } from '@/user/user.service';
import { generateUUID } from '@/utils/uuid';

import { RefreshTokenPayload } from './interfaces/jwt.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    private readonly usersService: UserService,
  ) {}

  generateAccessToken(user: User | UserModel): string {
    const payload = {
      sub: user.id,
      iss: 'nestjs-prisma-api',
      aud: 'nestjs-prisma-client',
      jti: generateUUID(),
    };

    return this.jwtService.sign(payload);
  }

  generateRefreshToken(user: User): string {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      type: 'refresh',
      iss: 'nestjs-prisma-api',
      aud: 'nestjs-prisma-client',
      jti: generateUUID(),
    };

    const expiresInDays = this.configService.get(
      'REFRESH_TOKEN_EXPIRES_IN_DAYS',
      { infer: true },
    );
    const secret = this.configService.get('REFRESH_TOKEN_SECRET', {
      infer: true,
    });

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: `${expiresInDays}d`,
    });
  }

  async verifyRefreshToken(token: string): Promise<User> {
    const secret = this.configService.get('REFRESH_TOKEN_SECRET', {
      infer: true,
    });

    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return user;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.verifyRefreshToken(refreshToken);
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);
    return { accessToken, refreshToken: newRefreshToken };
  }
}
