import { PrismaModule } from '@/lib/prisma/prisma.module';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisModule } from '@/lib/redis/redis.module';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

export const createTestModel = async (
  metadata: ModuleMetadata,
): Promise<TestingModule> => {
  return Test.createTestingModule({
    ...metadata,
    imports: [
      ...(!!metadata.imports ? metadata.imports : []),
      RedisModule,
      PrismaModule,
      ConfigModule,
    ],
    providers: [
      ...(!!metadata.providers ? metadata.providers : []),
      RedisSubscriptionService,
      PrismaService,
      ConfigService,
    ],
  }).compile();
};
