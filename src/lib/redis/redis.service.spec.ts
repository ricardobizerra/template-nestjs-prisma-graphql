import { TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { createTestModel } from '@/utils/create-test-model';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      providers: [RedisService],
    });

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
