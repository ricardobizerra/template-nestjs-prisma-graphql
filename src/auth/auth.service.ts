import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SignIn } from './models/sign-in.model';
import { userWithoutPassword } from '@/utils/user-without-password';
import { UserModel } from '@/user/models/user.model';
import * as schema from '@/lib/drizzle/schema';
import { UserService } from '@/user/user.service';

type User = typeof schema.users.$inferSelect;
import { HashingService } from '@/lib/hashing/hashing.service';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  async validateEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserModel> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    // OAuth-only users don't have a password
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses OAuth login. Please sign in with Google.',
      );
    }

    const passwordCheck = await this.hashingService.compare(
      password,
      user.password,
    );

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

  generateAccessToken(user: User | UserModel): string {
    return this.tokenService.generateAccessToken(user);
  }

  generateRefreshToken(user: User): string {
    return this.tokenService.generateRefreshToken(user);
  }

  async verifyRefreshToken(token: string): Promise<User> {
    return this.tokenService.verifyRefreshToken(token);
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.tokenService.refreshAccessToken(refreshToken);
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.usersService.revokeRefreshTokens(userId);
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<SignIn & { refreshToken: string }> {
    const userModel = await this.validateEmailAndPassword(email, password);

    // Get full user with tokenVersion
    const user = await this.usersService.findOne(userModel.id);
    if (!user) {
      throw new UnauthorizedException();
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: userModel,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    return this.passwordResetService.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.passwordResetService.resetPassword(token, newPassword);
  }
}
