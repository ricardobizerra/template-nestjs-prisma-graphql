import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { ErrorResponse } from './http-exception.filter';

/**
 * Prisma error codes mapping to HTTP status codes.
 * @see https://www.prisma.io/docs/orm/reference/error-reference
 */
const PRISMA_ERROR_MAP: Record<
  string,
  { status: HttpStatus; message: string }
> = {
  // Common query engine errors
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Value too long for column',
  },
  P2001: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Unique constraint violation',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Foreign key constraint failed',
  },
  P2004: { status: HttpStatus.BAD_REQUEST, message: 'Constraint failed' },
  P2005: { status: HttpStatus.BAD_REQUEST, message: 'Invalid value for field' },
  P2006: { status: HttpStatus.BAD_REQUEST, message: 'Invalid value provided' },
  P2007: { status: HttpStatus.BAD_REQUEST, message: 'Data validation error' },
  P2008: { status: HttpStatus.BAD_REQUEST, message: 'Failed to parse query' },
  P2009: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Failed to validate query',
  },
  P2010: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Raw query failed',
  },
  P2011: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Null constraint violation',
  },
  P2012: { status: HttpStatus.BAD_REQUEST, message: 'Missing required value' },
  P2013: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Missing required argument',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Required relation violation',
  },
  P2015: { status: HttpStatus.NOT_FOUND, message: 'Related record not found' },
  P2016: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Query interpretation error',
  },
  P2017: { status: HttpStatus.BAD_REQUEST, message: 'Records not connected' },
  P2018: {
    status: HttpStatus.NOT_FOUND,
    message: 'Required connected records not found',
  },
  P2019: { status: HttpStatus.BAD_REQUEST, message: 'Input error' },
  P2020: { status: HttpStatus.BAD_REQUEST, message: 'Value out of range' },
  P2021: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Table does not exist',
  },
  P2022: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Column does not exist',
  },
  P2023: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Inconsistent column data',
  },
  P2024: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Connection pool timeout',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
  P2026: { status: HttpStatus.BAD_REQUEST, message: 'Unsupported feature' },
  P2027: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Multiple database errors',
  },
  P2028: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Transaction API error',
  },
  P2030: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Fulltext index not found',
  },
  P2031: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'MongoDB replica set required',
  },
  P2033: { status: HttpStatus.BAD_REQUEST, message: 'Number out of range' },
  P2034: {
    status: HttpStatus.CONFLICT,
    message: 'Transaction conflict, please retry',
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(PrismaExceptionFilter.name);
  }

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const errorMapping = PRISMA_ERROR_MAP[exception.code] || {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
    };

    // Build detailed message for specific errors
    let detailedMessage = errorMapping.message;
    if (exception.code === 'P2002' && exception.meta?.target) {
      const fields = (exception.meta.target as string[]).join(', ');
      detailedMessage = `Unique constraint violation on: ${fields}`;
    } else if (exception.code === 'P2025' && exception.meta?.cause) {
      detailedMessage = exception.meta.cause as string;
    }

    const errorResponse: ErrorResponse = {
      statusCode: errorMapping.status,
      message: detailedMessage,
      error: 'Database Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) || undefined,
    };

    // Always log Prisma errors with full context
    this.logger.error(
      {
        ...errorResponse,
        prismaCode: exception.code,
        prismaMeta: exception.meta,
        stack: exception.stack,
      },
      `Prisma Exception: ${exception.code}`,
    );

    response.status(errorMapping.status).send(errorResponse);
  }
}

@Catch(Prisma.PrismaClientValidationError)
export class PrismaValidationExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(PrismaValidationExceptionFilter.name);
  }

  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid data provided',
      error: 'Validation Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) || undefined,
    };

    this.logger.error(
      {
        ...errorResponse,
        validationMessage: exception.message,
        stack: exception.stack,
      },
      'Prisma Validation Exception',
    );

    response.status(HttpStatus.BAD_REQUEST).send(errorResponse);
  }
}
