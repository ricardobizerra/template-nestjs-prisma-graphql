import { Module } from '@nestjs/common';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { USER_REPOSITORY_PORT } from '@/shared/application/ports/user-repository.port';
import { UserPrismaRepositoryAdapter } from '@/infrastructure/prisma/adapters/user-prisma.repository.adapter';
import { PASSWORD_RESET_TOKEN_REPOSITORY_PORT } from '@/shared/application/ports/password-reset-token-repository.port';
import { PasswordResetTokenPrismaRepositoryAdapter } from '@/infrastructure/prisma/adapters/password-reset-token-prisma.repository.adapter';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USER_REPOSITORY_PORT,
      useClass: UserPrismaRepositoryAdapter,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY_PORT,
      useClass: PasswordResetTokenPrismaRepositoryAdapter,
    },
  ],
  exports: [USER_REPOSITORY_PORT, PASSWORD_RESET_TOKEN_REPOSITORY_PORT],
})
export class PrismaRepositoriesModule {}
