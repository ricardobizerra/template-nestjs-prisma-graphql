import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env, envSchema } from '@/env';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { HealthModule } from '@/health/health.module';
import { UserModule } from '@/user/user.module';
import { RedisModule } from '@/lib/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { QueueModule } from '@/lib/queue/queue.module';
import { EmailModule } from '@/lib/email/email.module';
import { EmailProcessor } from '@/lib/queue/processors/email.processor';
import { StorageModule } from '@/lib/storage/storage.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppLoggerModule, LoggingInterceptor } from '@/lib/logger';
import {
  HttpExceptionFilter,
  PrismaExceptionFilter,
  PrismaValidationExceptionFilter,
} from '@/lib/filters';
import { BullBoardModule } from '@/lib/bull-board';
import { IdempotencyModule } from '@/lib/idempotency';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute globally
      },
    ]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Env, true>) => ({
        store: await redisStore({
          url: configService.get('REDIS_URL'),
        }),
      }),
      isGlobal: true,
    }),
    HealthModule,
    PrismaModule,
    UserModule,
    RedisModule,
    AuthModule,
    QueueModule,
    EmailModule,
    StorageModule,
    AppLoggerModule,
    // Bull Board - Queue monitoring UI at /admin/queues
    BullBoardModule.forRoot(),
    IdempotencyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EmailProcessor,
    // Global exception filters (order matters: most specific first)
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
