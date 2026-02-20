import { Module } from '@nestjs/common';
import { StorageModule } from '@/lib/storage/storage.module';
import { STORAGE_PORT } from '@/shared/application/ports/storage.port';
import { StorageAdapter } from '@/infrastructure/storage/adapters/storage.adapter';

@Module({
  imports: [StorageModule],
  providers: [
    {
      provide: STORAGE_PORT,
      useClass: StorageAdapter,
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageAdaptersModule {}
