import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_METADATA_KEY,
} from './idempotency.constants';
import { IdempotencyService, CachedResponse } from './idempotency.service';

interface IdempotencyMetadata {
  ttl: number;
  keyPrefix?: string;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // 1. Check if endpoint has @Idempotent decorator
    const metadata = this.reflector.get<IdempotencyMetadata | undefined>(
      IDEMPOTENCY_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      // Not an idempotent endpoint, proceed normally
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    // 2. Get idempotency key from header
    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER] as
      | string
      | undefined;

    if (!idempotencyKey) {
      // No idempotency key provided, proceed normally
      // (You could also throw BadRequestException if you want to enforce it)
      return next.handle();
    }

    const { ttl, keyPrefix } = metadata;

    // 3. Check if key exists or acquire lock
    const checkResult = await this.idempotencyService.checkAndLock(
      idempotencyKey,
      keyPrefix,
    );

    if (checkResult.status === 'cached') {
      // Return cached response
      const cached = checkResult.response;

      // Set status code from cached response
      response.status(cached.statusCode);

      // Set headers if any
      if (cached.headers) {
        Object.entries(cached.headers).forEach(([key, value]) => {
          response.header(key, value);
        });
      }

      return of(cached.body);
    }

    if (checkResult.status === 'locked') {
      // Another request is processing with same key
      throw new ConflictException(
        'A request with this idempotency key is already being processed. Please retry later.',
      );
    }

    // 4. Process request and cache response
    return next.handle().pipe(
      tap(async (body) => {
        const cachedResponse: CachedResponse = {
          statusCode: response.statusCode || 200,
          body,
        };

        await this.idempotencyService.cacheResponse(
          idempotencyKey,
          cachedResponse,
          ttl,
          keyPrefix,
        );
      }),
      catchError((error) => {
        // Release lock on error (don't cache error responses)
        // Fire-and-forget: lock will expire via TTL if release fails
        this.idempotencyService.releaseLock(idempotencyKey, keyPrefix);
        return throwError(() => error);
      }),
    );
  }
}
