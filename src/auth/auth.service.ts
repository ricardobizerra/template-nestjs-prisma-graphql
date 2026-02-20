import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignIn } from './models/sign-in.model';
import { UserModel } from '@/user/models/user.model';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from '@/shared/application/ports/session-token.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '@/shared/application/ports/user-repository.port';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '@/shared/application/ports/password-hasher.port';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';
import { RevokeAllSessionsUseCase } from '@/auth/application/use-cases/revoke-all-sessions.use-case';

@Injectable()
export class AuthService {
  constructor(
    private readonly signInUseCase: SignInUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(SESSION_TOKEN_PORT)
    private readonly sessionTokenPort: SessionTokenPort,
  ) {}

  async validateEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserModel> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException();
    }

    const passwordCheck = await this.passwordHasher.compare(
      password,
      user.password,
    );

    if (!passwordCheck) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image || undefined,
      role: user.role as any,
    };
  }

  async validateUserId(id: string): Promise<UserModel> {
    const user = await this.userRepository.findOne(id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image || undefined,
      role: user.role as any,
    };
  }

  generateAccessToken(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tokenVersion?: number;
    image?: string | null;
  }): string {
    return this.sessionTokenPort.generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      tokenVersion: user.tokenVersion ?? 0,
      image: user.image,
    });
  }

  generateRefreshToken(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tokenVersion: number;
    image?: string | null;
  }): string {
    return this.sessionTokenPort.generateRefreshToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      tokenVersion: user.tokenVersion,
      image: user.image,
    });
  }

  async verifyRefreshToken(token: string) {
    const payload = this.sessionTokenPort.verifyRefreshToken(token);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return user as any;
  }

  refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.refreshSessionUseCase.execute(refreshToken);
  }

  revokeAllRefreshTokens(userId: string): Promise<void> {
    return this.revokeAllSessionsUseCase.execute(userId);
  }

  signIn(
    email: string,
    password: string,
  ): Promise<SignIn & { refreshToken: string }> {
    return this.signInUseCase.execute(email, password) as Promise<
      SignIn & { refreshToken: string }
    >;
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.requestPasswordResetUseCase.execute(email);
  }

  resetPassword(token: string, newPassword: string): Promise<void> {
    return this.resetPasswordUseCase.execute(token, newPassword);
  }
}
