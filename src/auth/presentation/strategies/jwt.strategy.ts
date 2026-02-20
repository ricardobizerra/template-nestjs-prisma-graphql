import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/auth/interfaces/jwt.interface';
import { FastifyRequest } from 'fastify';
import { GetCurrentUserUseCase } from '@/auth/application/use-cases/get-current-user.use-case';

const cookieOrBearerExtractor = (req: FastifyRequest): string | null => {
  if (req?.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload) {
    return this.getCurrentUserUseCase.execute(payload.sub);
  }
}
