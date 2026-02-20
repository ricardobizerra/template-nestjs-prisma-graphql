import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_PORT,
  StoragePort,
} from '@/shared/application/ports/storage.port';
import { UpdateProfileUseCase } from '@/user/application/use-cases/update-profile.use-case';

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    @Inject(STORAGE_PORT)
    private readonly storagePort: StoragePort,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  async execute(input: {
    userId: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string }> {
    const key = `avatars/${input.userId}-${Date.now()}`;
    const { url } = await this.storagePort.upload(
      input.buffer,
      key,
      input.mimeType,
    );

    await this.updateProfileUseCase.execute(input.userId, { image: url });

    return { url };
  }
}
