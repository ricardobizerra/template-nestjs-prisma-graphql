import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '@/auth/interfaces/jwt.interface';
import { UserService } from '@/user/user.service';
import { userWithoutPassword } from '@/utils/user-without-password';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(context);
    const request = gqlCtx.getContext().req;
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get('JWT_SECRET'),
    });

    if (!payload) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    request['user'] = userWithoutPassword(user);

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
