import { Module } from '@nestjs/common';
import { ConfigAdaptersModule } from '@/infrastructure/config/config-adapters.module';
import { SecurityModule } from '@/infrastructure/security/security.module';
import { PrismaRepositoriesModule } from '@/infrastructure/prisma/prisma-repositories.module';
import { MessagingModule } from '@/infrastructure/messaging/messaging.module';
import { StorageAdaptersModule } from '@/infrastructure/storage/storage-adapters.module';

@Module({
  imports: [
    ConfigAdaptersModule,
    SecurityModule,
    PrismaRepositoriesModule,
    MessagingModule,
    StorageAdaptersModule,
  ],
  exports: [
    ConfigAdaptersModule,
    SecurityModule,
    PrismaRepositoriesModule,
    MessagingModule,
    StorageAdaptersModule,
  ],
})
export class InfrastructureModule {}
