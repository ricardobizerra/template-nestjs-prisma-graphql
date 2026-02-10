import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type Mocked,
} from 'vitest';
import { IdempotencyService, CachedResponse } from './idempotency.service';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_LOCK_PREFIX,
  IDEMPOTENCY_LOCK_TIMEOUT_MS,
} from './idempotency.constants';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let cacheService: Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    cacheService = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndLock', () => {
    const testKey = 'test-idempotency-key';

    it('should return cached response when key exists', async () => {
      const cachedResponse: CachedResponse = {
        statusCode: 201,
        body: { id: 1, name: 'Test' },
      };

      cacheService.get.mockResolvedValueOnce(cachedResponse);

      const result = await service.checkAndLock(testKey);

      expect(result).toEqual({ status: 'cached', response: cachedResponse });
      expect(cacheService.get).toHaveBeenCalledWith(
        `${IDEMPOTENCY_KEY_PREFIX}${testKey}`,
      );
    });

    it('should return locked status when another request is processing', async () => {
      cacheService.get
        .mockResolvedValueOnce(null) // No cached response
        .mockResolvedValueOnce('processing'); // Lock exists

      const result = await service.checkAndLock(testKey);

      expect(result).toEqual({ status: 'locked' });
    });

    it('should acquire lock and return new status when key does not exist', async () => {
      cacheService.get
        .mockResolvedValueOnce(null) // No cached response
        .mockResolvedValueOnce(null); // No lock

      const result = await service.checkAndLock(testKey);

      expect(result).toEqual({ status: 'new' });
      expect(cacheService.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_LOCK_PREFIX}${testKey}`,
        'processing',
        IDEMPOTENCY_LOCK_TIMEOUT_MS,
      );
    });

    it('should include keyPrefix in cache key when provided', async () => {
      const keyPrefix = 'payment';
      cacheService.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await service.checkAndLock(testKey, keyPrefix);

      expect(cacheService.get).toHaveBeenCalledWith(
        `${IDEMPOTENCY_KEY_PREFIX}${keyPrefix}:${testKey}`,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_LOCK_PREFIX}${keyPrefix}:${testKey}`,
        'processing',
        IDEMPOTENCY_LOCK_TIMEOUT_MS,
      );
    });
  });

  describe('cacheResponse', () => {
    const testKey = 'test-idempotency-key';
    const ttlSeconds = 600;

    it('should cache response and release lock', async () => {
      const response: CachedResponse = {
        statusCode: 201,
        body: { id: 1 },
      };

      await service.cacheResponse(testKey, response, ttlSeconds);

      expect(cacheService.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_KEY_PREFIX}${testKey}`,
        response,
        ttlSeconds * 1000,
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        `${IDEMPOTENCY_LOCK_PREFIX}${testKey}`,
      );
    });

    it('should include keyPrefix in cache key when provided', async () => {
      const keyPrefix = 'order';
      const response: CachedResponse = {
        statusCode: 200,
        body: { success: true },
      };

      await service.cacheResponse(testKey, response, ttlSeconds, keyPrefix);

      expect(cacheService.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_KEY_PREFIX}${keyPrefix}:${testKey}`,
        response,
        ttlSeconds * 1000,
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        `${IDEMPOTENCY_LOCK_PREFIX}${keyPrefix}:${testKey}`,
      );
    });
  });

  describe('releaseLock', () => {
    it('should delete the lock key', async () => {
      const testKey = 'test-key';

      await service.releaseLock(testKey);

      expect(cacheService.del).toHaveBeenCalledWith(
        `${IDEMPOTENCY_LOCK_PREFIX}${testKey}`,
      );
    });

    it('should include keyPrefix when provided', async () => {
      const testKey = 'test-key';
      const keyPrefix = 'transaction';

      await service.releaseLock(testKey, keyPrefix);

      expect(cacheService.del).toHaveBeenCalledWith(
        `${IDEMPOTENCY_LOCK_PREFIX}${keyPrefix}:${testKey}`,
      );
    });
  });
});
