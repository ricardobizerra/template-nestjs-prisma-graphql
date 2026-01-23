import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { PinoLogger } from 'nestjs-pino';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: any;

  const mockLogger = {
    setContext: vi.fn(),
    assign: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: vi.fn(),
  } as unknown as ExecutionContext;

  const mockCallHandler = {
    handle: vi.fn(),
  } as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    logger = module.get<PinoLogger>(PinoLogger);

    // Reset and setup mocks inside beforeEach because of vitest.config.ts mockReset: true
    vi.mocked(mockExecutionContext.switchToHttp).mockImplementation(() => ({
      getRequest: vi.fn().mockReturnValue({
        url: '/test',
        method: 'GET',
        user: { id: 'user-1' },
        raw: {},
      }),
      getResponse: vi.fn().mockReturnValue({
        statusCode: 200,
      }),
    })) as any;

    vi.mocked(mockCallHandler.handle).mockReturnValue(of('response'));
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should intercept and log success', async () => {
    const stream$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );
    await lastValueFrom(stream$);

    expect(logger.assign).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/test', statusCode: 200 }),
      'Request completed',
    );
  });

  it('should intercept and log error', async () => {
    const error = new Error('test-error');
    vi.mocked(mockCallHandler.handle).mockReturnValue(throwError(() => error));

    try {
      const stream$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      await lastValueFrom(stream$);
    } catch (err) {
      expect(err).toBe(error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'test-error' }),
        'Request failed',
      );
    }
  });
});
