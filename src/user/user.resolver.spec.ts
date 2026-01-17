import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from '@/user/user.resolver';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';

describe('UserResolver', () => {
  let resolver: UserResolver;

  const mockUserService = {
    findMany: vi.fn().mockResolvedValue({ edges: [], pageInfo: {} }),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };

  const mockAuthService = {
    validateUser: vi.fn().mockResolvedValue(null),
    login: vi.fn().mockResolvedValue({ accessToken: 'token' }),
  };

  const mockRedisSubscriptionService = {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisSubscriptionService, useValue: mockRedisSubscriptionService },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
