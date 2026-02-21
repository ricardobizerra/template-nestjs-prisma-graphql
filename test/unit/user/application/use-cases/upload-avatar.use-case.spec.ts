import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadAvatarUseCase } from '@/user/application/use-cases/upload-avatar.use-case';

describe('UploadAvatarUseCase', () => {
  const storagePort = { upload: vi.fn() } as any;
  const updateProfileUseCase = { execute: vi.fn() } as any;
  let useCase: UploadAvatarUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UploadAvatarUseCase(storagePort, updateProfileUseCase);
  });

  it('uploads and updates profile image', async () => {
    storagePort.upload.mockResolvedValue({ url: 'https://x/avatar.png' });
    const result = await useCase.execute({
      userId: 'u1',
      buffer: Buffer.from('a'),
      mimeType: 'image/png',
    });
    expect(storagePort.upload).toHaveBeenCalled();
    expect(updateProfileUseCase.execute).toHaveBeenCalledWith('u1', {
      image: 'https://x/avatar.png',
    });
    expect(result.url).toBe('https://x/avatar.png');
  });
});
