import { TestingModule } from '@nestjs/testing';
import { RedisCacheService } from './redis-cache.service';
import { createTestModel } from '@/utils/create-test-model';

describe('RedisCacheService', () => {
  let service: RedisCacheService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      providers: [RedisCacheService],
    });

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
