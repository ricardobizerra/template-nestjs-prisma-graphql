import { Module, forwardRef, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { GitHubStrategy } from './github.strategy';
import { DrizzleModule } from '@/lib/drizzle/drizzle.module';
import { QueueModule } from '@/lib/queue/queue.module';
import { UserModule } from '@/user/user.module';
import { Env } from '@/env';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';
import { HashingModule } from '@/lib/hashing/hashing.module';

// Conditionally register optional OAuth strategies based on env vars
const optionalProviders: Provider[] = [];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  optionalProviders.push(GitHubStrategy);
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        global: true,
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN_SECONDS') },
      }),
    }),
    DrizzleModule,
    QueueModule,
    HashingModule,
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    TokenService,
    PasswordResetService,
    ...optionalProviders,
  ],
  exports: [AuthService],
})
export class AuthModule {}
