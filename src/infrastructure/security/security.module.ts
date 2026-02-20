import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { SESSION_TOKEN_PORT } from '@/shared/application/ports/session-token.port';
import { JwtSessionTokenAdapter } from '@/infrastructure/security/adapters/session-token.adapter';
import { PASSWORD_HASHER_PORT } from '@/shared/application/ports/password-hasher.port';
import { BcryptPasswordHasherAdapter } from '@/infrastructure/security/adapters/password-hasher.adapter';
import { ConfigAdaptersModule } from '@/infrastructure/config/config-adapters.module';

@Module({
  imports: [
    ConfigModule,
    ConfigAdaptersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        global: true,
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN_SECONDS') },
      }),
    }),
  ],
  providers: [
    {
      provide: SESSION_TOKEN_PORT,
      useClass: JwtSessionTokenAdapter,
    },
    {
      provide: PASSWORD_HASHER_PORT,
      useClass: BcryptPasswordHasherAdapter,
    },
  ],
  exports: [SESSION_TOKEN_PORT, PASSWORD_HASHER_PORT],
})
export class SecurityModule {}
