import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter, ErrorResponse } from '@/lib/filters/http-exception.filter';
import { PinoLogger } from 'nestjs-pino';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { FastifyReply, FastifyRequest } from 'fastify';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: PinoLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: PinoLogger,
          useValue: {
            setContext: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            assign: vi.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
    logger = module.get<PinoLogger>(PinoLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  const createMockArgumentsHost = (url = '/test-url', requestId?: string) => {
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    const mockRequest = {
      url,
      headers: requestId ? { 'x-request-id': requestId } : {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockReply,
        getRequest: () => mockRequest,
      }),
    };
    return { mockHost, mockReply, mockRequest };
  };

  describe('catch', () => {
    it('should format HttpException (object message)', () => {
      const { mockHost, mockReply } = createMockArgumentsHost(
        '/test',
        'req-123',
      );
      const status = HttpStatus.BAD_REQUEST;
      const message = 'Validation failed';
      const error = 'Bad Request';
      const exception = new HttpException({ message, error }, status);

      filter.catch(exception, mockHost as any);

      expect(mockReply.status).toHaveBeenCalledWith(status);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: status,
          message,
          error,
          path: '/test',
          requestId: 'req-123',
        }),
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should format HttpException (string message)', () => {
      const { mockHost, mockReply } = createMockArgumentsHost('/test');
      const status = HttpStatus.FORBIDDEN;
      const message = 'Forbidden resource';
      const exception = new HttpException(message, status);

      filter.catch(exception, mockHost as any);

      expect(mockReply.status).toHaveBeenCalledWith(status);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: status,
          message,
          error: 'FORBIDDEN',
        }),
      );
    });

    it('should log 500 errors as error', () => {
      const { mockHost } = createMockArgumentsHost();
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      const exception = new HttpException('Server failure', status);

      filter.catch(exception, mockHost as any);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle missing request-id header', () => {
      const { mockHost, mockReply } = createMockArgumentsHost();
      const exception = new HttpException('Error', 400);

      filter.catch(exception, mockHost as any);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: undefined,
        }),
      );
    });
  });
});
