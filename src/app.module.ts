import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
