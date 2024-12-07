import { TestingModule } from '@nestjs/testing';
import { UserResolver } from '@/user/user.resolver';
import { UserService } from '@/user/user.service';
import { UserModule } from '@/user/user.module';
import { createTestModel } from '@/utils/create-test-model';

describe('UserResolver', () => {
  let resolver: UserResolver;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      imports: [UserModule],
      providers: [UserResolver, UserService],
    });

    resolver = module.get<UserResolver>(UserResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
