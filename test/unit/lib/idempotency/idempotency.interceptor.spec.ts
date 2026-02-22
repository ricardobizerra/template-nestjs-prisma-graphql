import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError, firstValueFrom } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IdempotencyInterceptor } from '@/lib/idempotency/idempotency.interceptor';
import {
  IdempotencyService,
  CachedResponse,
} from '@/lib/idempotency/idempotency.service';
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_METADATA_KEY,
} from '@/lib/idempotency/idempotency.constants';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: ReturnType<typeof vi.mocked<Reflector>>;
  let idempotencyService: ReturnType<typeof vi.mocked<IdempotencyService>>;

  const mockRequest = {
    headers: {} as Record<string, string>,
  };

  const mockResponse = {
    statusCode: 200,
    status: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: () => vi.fn(),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ id: 1, name: 'Test' }),
  };

  beforeEach(async () => {
    const mockReflector = {
      get: vi.fn(),
    };

    const mockIdempotencyService = {
      checkAndLock: vi.fn(),
      cacheResponse: vi.fn(),
      releaseLock: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    reflector = module.get(Reflector);
    idempotencyService = module.get(IdempotencyService);

    // Reset mock state
    mockRequest.headers = {};
    mockResponse.statusCode = 200;
    vi.clearAllMocks();
  });

  describe('when endpoint has no @Idempotent decorator', () => {
    it('should proceed normally without checking idempotency', async () => {
      reflector.get.mockReturnValue(undefined);

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(idempotencyService.checkAndLock).not.toHaveBeenCalled();
    });
  });

  describe('when endpoint has @Idempotent decorator', () => {
    const metadata = { ttl: 600, keyPrefix: undefined };

    beforeEach(() => {
      reflector.get.mockReturnValue(metadata);
    });

    it('should proceed normally when no idempotency key header is provided', async () => {
      mockRequest.headers = {};

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(idempotencyService.checkAndLock).not.toHaveBeenCalled();
    });

    it('should return cached response when key exists', async () => {
      const cachedResponse: CachedResponse = {
        statusCode: 201,
        body: { id: 2, cached: true },
        headers: { 'x-custom': 'value' },
      };

      mockRequest.headers = { [IDEMPOTENCY_HEADER]: 'test-key-123' };
      idempotencyService.checkAndLock.mockResolvedValue({
        status: 'cached',
        response: cachedResponse,
      });

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await firstValueFrom(result$);

      expect(result).toEqual(cachedResponse.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.header).toHaveBeenCalledWith('x-custom', 'value');
    });

    it('should throw ConflictException when key is locked', async () => {
      mockRequest.headers = { [IDEMPOTENCY_HEADER]: 'test-key-123' };
      idempotencyService.checkAndLock.mockResolvedValue({ status: 'locked' });

      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      ).rejects.toThrow(ConflictException);
    });

    it('should process request and cache response for new key', async () => {
      mockRequest.headers = { [IDEMPOTENCY_HEADER]: 'test-key-123' };
      mockResponse.statusCode = 201;
      idempotencyService.checkAndLock.mockResolvedValue({ status: 'new' });

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(idempotencyService.cacheResponse).toHaveBeenCalledWith(
        'test-key-123',
        { statusCode: 201, body: { id: 1, name: 'Test' } },
        600,
        undefined,
      );
    });

    it('should release lock on error without caching', async () => {
      mockRequest.headers = { [IDEMPOTENCY_HEADER]: 'test-key-123' };
      idempotencyService.checkAndLock.mockResolvedValue({ status: 'new' });

      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error('Processing failed')),
      };

      const result$ = await interceptor.intercept(
        mockExecutionContext,
        errorHandler,
      );

      await expect(firstValueFrom(result$)).rejects.toThrow(
        'Processing failed',
      );
      expect(idempotencyService.releaseLock).toHaveBeenCalledWith(
        'test-key-123',
        undefined,
      );
      expect(idempotencyService.cacheResponse).not.toHaveBeenCalled();
    });
  });
});
