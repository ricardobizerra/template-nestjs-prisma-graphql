import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { ConfigPort } from '@/shared/application/ports/config.port';

@Injectable()
export class AppConfigAdapter implements ConfigPort {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  getNodeEnv(): string {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  getJwtExpiresInSeconds(): number {
    return this.configService.get('JWT_EXPIRES_IN_SECONDS', { infer: true });
  }

  getRefreshTokenExpiresInDays(): number {
    return this.configService.get('REFRESH_TOKEN_EXPIRES_IN_DAYS', {
      infer: true,
    });
  }

  getRefreshTokenSecret(): string {
    return this.configService.get('REFRESH_TOKEN_SECRET', { infer: true });
  }

  getFrontendUrl(): string {
    return this.configService.get('FRONTEND_URL', { infer: true });
  }
}
