import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from '@/lib/redis/redis-cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let cacheManager: any;

  const mockCacheManager = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    cacheManager = module.get<any>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return value from cache if exists', async () => {
      cacheManager.get.mockResolvedValue('cached-item');
      const result = await service.get('any' as any);
      expect(result).toBe('cached-item');
      expect(cacheManager.get).toHaveBeenCalled();
    });

    it('should call factory function and set cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      const factory = vi.fn().mockResolvedValue('new-item');
      (service as any).keyFunction = { test: factory };

      const result = await service.get('test' as any);

      expect(result).toBe('new-item');
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('test', 'new-item');
    });

    it('should return null if not in cache and no factory function', async () => {
      cacheManager.get.mockResolvedValue(null);
      const result = await service.get('unknown' as any);
      expect(result).toBeNull();
    });

    it('should not set cache if factory returns null', async () => {
      cacheManager.get.mockResolvedValue(null);
      const factory = vi.fn().mockResolvedValue(null);
      (service as any).keyFunction = { test: factory };

      const result = await service.get('test' as any);
      expect(result).toBeNull();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      await service.set('key' as any, 'value');
      expect(cacheManager.set).toHaveBeenCalledWith('key', 'value');
    });
  });
});
