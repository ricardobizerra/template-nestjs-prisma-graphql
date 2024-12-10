import { UserService } from '@/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { SignIn } from './models/sign-in.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<SignIn> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const passwordCheck = await compare(password, user?.password);

    if (!passwordCheck) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
