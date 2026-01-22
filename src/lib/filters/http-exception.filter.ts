import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract message from exception response
    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = HttpStatus[status] || 'Error';
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message = (responseObj.message as string | string[]) || exception.message;
      error = (responseObj.error as string) || HttpStatus[status] || 'Error';
    } else {
      message = exception.message;
      error = HttpStatus[status] || 'Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) || undefined,
    };

    // Log 4xx as warnings, 5xx as errors
    if (status >= 500) {
      this.logger.error(
        {
          ...errorResponse,
          stack: exception.stack,
        },
        `HTTP Exception: ${error}`,
      );
    } else if (status >= 400) {
      this.logger.warn(errorResponse, `HTTP Exception: ${error}`);
    }

    response.status(status).send(errorResponse);
  }
}
