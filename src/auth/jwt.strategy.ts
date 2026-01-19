import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtPayload } from './interfaces/jwt.interface';
import { UserModel } from '@/user/models/user.model';
import { Request } from 'express';

// Custom extractor that checks cookie first, then Authorization header
const cookieOrBearerExtractor = (req: Request): string | null => {
  // Try cookie first
  if (req?.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // Fallback to Authorization header
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
    readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload & UserModel) {
    const user = await this.authService.validateUserId(payload.sub);
    return user;
  }
}
