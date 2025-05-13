import { PrismaModule } from '@/lib/prisma/prisma.module';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisModule } from '@/lib/redis/redis.module';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from '@/lib/redis/redis-cache.service';
import { CacheModule } from '@nestjs/cache-manager';
import { Env, envSchema } from '@/env';
import { redisStore } from 'cache-manager-redis-store';

export const createTestModel = async (
  metadata: ModuleMetadata,
): Promise<TestingModule> => {
  return Test.createTestingModule({
    ...metadata,
    imports: [
      ...(!!metadata.imports ? metadata.imports : []),
      RedisModule,
      PrismaModule,
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
    ],
    providers: [
      ...(!!metadata.providers ? metadata.providers : []),
      RedisCacheService,
      RedisSubscriptionService,
      PrismaService,
      ConfigService,
    ],
  }).compile();
};
