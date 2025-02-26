import { TestingModule } from '@nestjs/testing';
import { RedisSubscriptionService } from './redis-subscription.service';
import { createTestModel } from '@/utils/create-test-model';

describe('RedisSubscriptionService', () => {
  let service: RedisSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      providers: [RedisSubscriptionService],
    });

    service = module.get<RedisSubscriptionService>(RedisSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
