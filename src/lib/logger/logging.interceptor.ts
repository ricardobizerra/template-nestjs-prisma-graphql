import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<FastifyRequest & { user?: { id: string } }>();
    const res = ctx.getResponse<FastifyReply>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.info(
            {
              userId: req.user?.id || null,
              endpoint: req.url,
              method: req.method,
              statusCode: res.statusCode,
              responseTime: duration,
              duration,
            },
            'Request completed',
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.error(
            {
              userId: req.user?.id || null,
              endpoint: req.url,
              method: req.method,
              statusCode: res.statusCode || 500,
              responseTime: duration,
              duration,
              error: err.message,
              stack: err.stack,
            },
            'Request failed',
          );
        },
      }),
    );
  }
}
