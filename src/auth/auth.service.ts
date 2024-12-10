import { UserModel } from '@/user/models/user.model';
import { UserService } from '@/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UserService) {}

  async signIn(username: string, pass: string): Promise<UserModel> {
    const user = await this.usersService.findOne(username);

    const passwordCheck = await compare(pass, user.password);

    if (!passwordCheck) {
      throw new UnauthorizedException();
    }

    const { password, ...result } = user;

    // TODO: Generate a JWT and return it here
    // instead of the user object

    return result;
  }
}
