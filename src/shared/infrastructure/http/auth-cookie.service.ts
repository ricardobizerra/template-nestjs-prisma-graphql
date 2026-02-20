import { Inject, Injectable } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import {
  CONFIG_PORT,
  ConfigPort,
} from '@/shared/application/ports/config.port';

@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(CONFIG_PORT)
    private readonly configPort: ConfigPort,
  ) {}

  setTokenCookies(
    res: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ): FastifyReply {
    const isProduction = this.configPort.getNodeEnv() === 'production';

    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: this.configPort.getJwtExpiresInSeconds(),
      path: '/',
    });

    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: this.configPort.getRefreshTokenExpiresInDays() * 24 * 60 * 60,
      path: '/auth',
    });

    return res;
  }

  clearTokenCookies(res: FastifyReply): FastifyReply {
    const isProduction = this.configPort.getNodeEnv() === 'production';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/auth',
    });

    return res;
  }
}
