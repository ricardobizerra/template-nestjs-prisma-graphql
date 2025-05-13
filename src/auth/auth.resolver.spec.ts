import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { UserModule } from '@/user/user.module';
import { createTestModel } from '@/utils/create-test-model';

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      imports: [AuthModule, UserModule],
      providers: [AuthResolver, AuthService],
    });

    resolver = module.get<AuthResolver>(AuthResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
