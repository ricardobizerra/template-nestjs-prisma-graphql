import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@/lib/storage/storage.interface';
import { StoragePort } from '@/shared/application/ports/storage.port';

@Injectable()
export class StorageAdapter implements StoragePort {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string }> {
    const result = await this.storageProvider.upload(buffer, key, contentType);
    return { url: result.url };
  }
}
