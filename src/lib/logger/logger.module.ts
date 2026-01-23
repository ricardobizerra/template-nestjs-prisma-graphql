import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const nodeEnv = configService.get('NODE_ENV', { infer: true });
        const appName = configService.get('APP_NAME', { infer: true });
        const isProduction = nodeEnv === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
            genReqId: (req: IncomingMessage) =>
              (req.headers['x-request-id'] as string) || randomUUID(),
            customProps: (req: any) => ({
              requestId: req.id || req.raw?.id,
              userId: req.user?.id || req.raw?.user?.id || null,
              correlationId:
                req.headers?.['x-correlation-id'] ||
                req.raw?.headers?.['x-correlation-id'] ||
                req.id ||
                req.raw?.id,
              service: appName,
              environment: nodeEnv,
            }),
            customLogLevel: (
              _req: IncomingMessage,
              res: ServerResponse,
              err?: Error,
            ) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
              `${req.method} ${req.url} completed with ${res.statusCode}`,
            customErrorMessage: (
              req: IncomingMessage,
              _res: ServerResponse,
              err: Error,
            ) => `${req.method} ${req.url} failed: ${err.message}`,
            serializers: {
              req: (req: any) => ({
                id: req.id || req.raw?.id,
                method: req.method,
                url: req.url,
                userId: req.user?.id || req.raw?.user?.id || null,
                headers: {
                  host: req.headers.host,
                  'user-agent': req.headers['user-agent'],
                  'x-correlation-id':
                    req.headers['x-correlation-id'] ||
                    req.raw?.headers?.['x-correlation-id'],
                },
              }),
              res: (res: ServerResponse) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
    }),
  ],
})
export class AppLoggerModule {}
