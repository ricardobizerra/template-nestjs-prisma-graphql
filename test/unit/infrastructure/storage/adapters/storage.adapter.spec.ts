import { describe, it, expect, vi } from 'vitest';
import { StorageAdapter } from '@/infrastructure/storage/adapters/storage.adapter';

describe('StorageAdapter', () => {
  it('returns only url from storage provider upload', async () => {
    const storageProvider = {
      upload: vi.fn().mockResolvedValue({ key: 'k', url: 'https://x', contentType: 'image/png', size: 1 }),
    } as any;
    const adapter = new StorageAdapter(storageProvider);
    const result = await adapter.upload(Buffer.from('a'), 'k', 'image/png');
    expect(result).toEqual({ url: 'https://x' });
  });
});
