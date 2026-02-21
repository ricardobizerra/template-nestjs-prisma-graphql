import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaExceptionFilter,
  PrismaValidationExceptionFilter,
} from '@/lib/filters/prisma-exception.filter';
import { PinoLogger } from 'nestjs-pino';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('PrismaExceptionFilters', () => {
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

  describe('PrismaExceptionFilter', () => {
    let filter: PrismaExceptionFilter;
    let logger: PinoLogger;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrismaExceptionFilter,
          {
            provide: PinoLogger,
            useValue: {
              setContext: vi.fn(),
              error: vi.fn(),
              assign: vi.fn(),
            },
          },
        ],
      }).compile();

      filter = module.get<PrismaExceptionFilter>(PrismaExceptionFilter);
      logger = module.get<PinoLogger>(PinoLogger);
    });

    it('should map P2002 (Unique Constraint) to CONFLICT', () => {
      const { mockHost, mockReply } = createMockArgumentsHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        },
      );

      filter.catch(exception, mockHost as any);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint violation on: email',
        }),
      );
    });

    it('should map P2025 (Not Found) to NOT_FOUND', () => {
      const { mockHost, mockReply } = createMockArgumentsHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: { cause: 'Custom not found message' },
        },
      );

      filter.catch(exception, mockHost as any);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom not found message',
        }),
      );
    });

    it('should fallback to 500 for unknown error codes', () => {
      const { mockHost, mockReply } = createMockArgumentsHost();
      const exception = new Prisma.PrismaClientKnownRequestError('Unknown', {
        code: 'P9999',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost as any);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should log the error with full prisma context', () => {
      const { mockHost } = createMockArgumentsHost();
      const exception = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost as any);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('PrismaValidationExceptionFilter', () => {
    let filter: PrismaValidationExceptionFilter;
    let logger: PinoLogger;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrismaValidationExceptionFilter,
          {
            provide: PinoLogger,
            useValue: {
              setContext: vi.fn(),
              error: vi.fn(),
              assign: vi.fn(),
            },
          },
        ],
      }).compile();

      filter = module.get<PrismaValidationExceptionFilter>(
        PrismaValidationExceptionFilter,
      );
      logger = module.get<PinoLogger>(PinoLogger);
    });

    it('should return BAD_REQUEST on validation error', () => {
      const { mockHost, mockReply } = createMockArgumentsHost();
      const exception = new Prisma.PrismaClientValidationError(
        'Invalid input',
        { clientVersion: '5.0.0' },
      );

      filter.catch(exception, mockHost as any);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid data provided',
          error: 'Validation Error',
        }),
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
