import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, StorageProvider } from './storage.interface';
import { S3StorageProvider } from './s3.provider';
import { R2StorageProvider } from './r2.provider';
import { Env } from '@/env';

type StorageProviderType = Env['STORAGE_PROVIDER'];

const storageProviderFactory = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (
    configService: ConfigService<Env, true>,
  ): StorageProvider | null => {
    const provider = configService.get('STORAGE_PROVIDER', { infer: true });

    if (!provider) {
      return null;
    }

    const providers: Record<
      NonNullable<StorageProviderType>,
      new (configService: ConfigService<Env, true>) => StorageProvider
    > = {
      s3: S3StorageProvider,
      r2: R2StorageProvider,
    };

    const ProviderClass = providers[provider];

    if (!ProviderClass) {
      throw new Error(`Unknown storage provider: ${provider}`);
    }

    return new ProviderClass(configService);
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [storageProviderFactory],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
