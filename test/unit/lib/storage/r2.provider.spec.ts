import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2StorageProvider } from '@/lib/storage/r2.provider';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

vi.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand { constructor(public input: any) {} }
  class DeleteObjectCommand { constructor(public input: any) {} }
  class GetObjectCommand { constructor(public input: any) {} }
  class S3Client {
    send = vi.fn().mockResolvedValue(undefined);
  }
  return { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url'),
}));

describe('R2StorageProvider', () => {
  const configService = {
    get: vi.fn((key: string) => ({
      STORAGE_BUCKET: 'bucket',
      STORAGE_ENDPOINT: 'https://123abc.r2.cloudflarestorage.com',
      STORAGE_ACCESS_KEY: 'ak',
      STORAGE_SECRET_KEY: 'sk',
    } as any)[key]),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSignedUrl).mockResolvedValue('https://signed-url');
  });

  it('uploads and returns expected result', async () => {
    const provider = new R2StorageProvider(configService);
    const result = await provider.upload(Buffer.from('a'), 'k', 'image/png');
    expect(result.key).toBe('k');
    expect(result.url).toContain('r2.dev/k');
  });

  it('deletes and signs urls', async () => {
    const provider = new R2StorageProvider(configService);
    await expect(provider.delete('k')).resolves.toBeUndefined();
    await expect(provider.getSignedUrl('k')).resolves.toBe('https://signed-url');
  });
});
