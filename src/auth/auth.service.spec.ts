import { TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { createTestModel } from '@/utils/create-test-model';
import { UserModule } from '@/user/user.module';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await createTestModel({
      imports: [UserModule],
      providers: [AuthService],
    });

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
