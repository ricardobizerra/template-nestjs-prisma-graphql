import { Module, Provider } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@/auth/presentation/http/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { JwtStrategy } from '@/auth/presentation/strategies/jwt.strategy';
import { GoogleStrategy } from '@/auth/presentation/strategies/google.strategy';
import { GitHubStrategy } from '@/auth/presentation/strategies/github.strategy';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';
import { OAuthSignInUseCase } from '@/auth/application/use-cases/oauth-sign-in.use-case';
import { RevokeAllSessionsUseCase } from '@/auth/application/use-cases/revoke-all-sessions.use-case';
import { GetCurrentUserUseCase } from '@/auth/application/use-cases/get-current-user.use-case';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';

const optionalProviders: Provider[] = [];
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  optionalProviders.push(GitHubStrategy);
}

@Module({
  imports: [PassportModule, InfrastructureModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCookieService,
    SignInUseCase,
    RefreshSessionUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    OAuthSignInUseCase,
    RevokeAllSessionsUseCase,
    GetCurrentUserUseCase,
    JwtStrategy,
    GoogleStrategy,
    ...optionalProviders,
  ],
  exports: [AuthService, SignInUseCase, AuthCookieService],
})
export class AuthModule {}
