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

    // Assign userId to logger context for all subsequent logs in this request
    if (req.user?.id) {
      this.logger.assign({ userId: req.user.id });
      // Also attach to raw request so pino-http's customProps can see it
      (req.raw as any).user = req.user;
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.info(
            {
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
