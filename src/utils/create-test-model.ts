import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from '@/lib/redis/redis-cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '@/lib/prisma/prisma.service';

// Mock Prisma Service
const mockPrismaService = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  user: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
};

// Mock Redis Cache Service
const mockRedisCacheService = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
};

// Mock Redis Subscription Service
const mockRedisSubscriptionService = {
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
};

// Mock Cache Manager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn().mockResolvedValue(undefined),
};

// Mock ConfigService with test values
const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1d',
    };
    return config[key];
  }),
};

export const createTestModel = async (
  metadata: ModuleMetadata,
): Promise<TestingModule> => {
  return Test.createTestingModule({
    ...metadata,
    imports: [
      ...(metadata.imports ? metadata.imports : []),
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
            REDIS_URL: 'redis://localhost:6379',
          }),
        ],
      }),
    ],
    providers: [
      ...(metadata.providers ? metadata.providers : []),
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: RedisCacheService, useValue: mockRedisCacheService },
      {
        provide: RedisSubscriptionService,
        useValue: mockRedisSubscriptionService,
      },
      { provide: CACHE_MANAGER, useValue: mockCacheManager },
      { provide: ConfigService, useValue: mockConfigService },
    ],
  }).compile();
};
