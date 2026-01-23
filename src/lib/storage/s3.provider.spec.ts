import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3StorageProvider } from './s3.provider';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let mockClient: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageProvider,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'STORAGE_BUCKET') return 'test-bucket';
              if (key === 'STORAGE_REGION') return 'us-east-1';
              if (key === 'STORAGE_ACCESS_KEY') return 'access';
              if (key === 'STORAGE_SECRET_KEY') return 'secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<S3StorageProvider>(S3StorageProvider);
    mockClient = {
      send: vi.fn(),
    };
    (provider as any).client = mockClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a file and return result', async () => {
      mockClient.send.mockResolvedValue({});
      const buffer = Buffer.from('test');
      const key = 'test.txt';
      const contentType = 'text/plain';

      const result = await provider.upload(buffer, key, contentType);

      expect(result).toEqual({
        key,
        url: 'https://test-bucket.s3.us-east-1.amazonaws.com/test.txt',
        contentType,
        size: buffer.length,
      });
      expect(mockClient.send).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      mockClient.send.mockResolvedValue({});
      await provider.delete('test.txt');
      expect(mockClient.send).toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    it('should return a signed URL', async () => {
      const mockUrl = 'https://signed-url.com';
      (getSignedUrl as any).mockResolvedValue(mockUrl);

      const url = await provider.getSignedUrl('test.txt');

      expect(url).toBe(mockUrl);
    });
  });

  describe('getPublicUrl', () => {
    it('should return a public URL', () => {
      const url = provider.getPublicUrl('test.txt');
      expect(url).toBe(
        'https://test-bucket.s3.us-east-1.amazonaws.com/test.txt',
      );
    });
  });
});
