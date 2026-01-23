import { Test, TestingModule } from '@nestjs/testing';
import { RedisSubscriptionService } from './redis-subscription.service';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';

// Define mocks that we want to track
const subscribeSpy = vi.fn().mockResolvedValue(undefined);
const publishSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      subscribe = subscribeSpy;
      publish = publishSpy;
      on = vi.fn();
    },
  };
});

describe('RedisSubscriptionService', () => {
  let service: RedisSubscriptionService;

  const mockConfigService = {
    get: vi.fn((key) => {
      if (key === 'REDIS_HOST') return 'localhost';
      return 'mock-value';
    }),
  };

  beforeEach(async () => {
    // Reset spies manually because vitest.config.ts mockReset: true
    subscribeSpy.mockClear();
    publishSpy.mockClear();
    subscribeSpy.mockResolvedValue(undefined);
    publishSpy.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisSubscriptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisSubscriptionService>(RedisSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should subscribe to EVENTS on init', async () => {
    await service.onModuleInit();
    expect(subscribeSpy).toHaveBeenCalledWith('EVENTS');
  });

  it('should publish message', async () => {
    await service.publish('channel', { data: 1 });
    expect(publishSpy).toHaveBeenCalledWith('channel', '{"data":1}');
  });

  it('should return subscriber instance', () => {
    const subscriber = service.getSubscriber();
    expect(subscriber).toBeDefined();
    expect(subscriber.subscribe).toBeDefined();
  });

  it('should return publisher instance', () => {
    const publisher = service.getPublisher();
    expect(publisher).toBeDefined();
    expect(publisher.publish).toBeDefined();
  });
});
