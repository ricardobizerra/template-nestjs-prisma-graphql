import { TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { createTestModel } from '@/utils/create-test-model';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      providers: [UserService],
    });

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
