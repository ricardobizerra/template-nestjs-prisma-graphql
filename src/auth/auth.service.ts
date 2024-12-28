import { UserService } from '@/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { SignIn } from './models/sign-in.model';
import { userWithoutPassword } from '@/utils/user-without-password';
import { UserModel } from '@/user/models/user.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserModel> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const passwordCheck = await compare(password, user?.password);

    if (!passwordCheck) {
      throw new UnauthorizedException();
    }

    return userWithoutPassword(user);
  }

  async validateUserId(id: string): Promise<UserModel> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return userWithoutPassword(user);
  }

  async signIn(email: string, password: string): Promise<SignIn> {
    const user = await this.validateEmailAndPassword(email, password);

    const payload = {
      sub: user.id,
      ...user,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user,
    };
  }
}
