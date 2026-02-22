import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '@/user/user.service';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import { UserRepository } from '@/user/user.repository';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { OAuthProvider } from '@/lib/drizzle/schema';
import { KeysetPaginatedFindMany } from '@/utils/keyset-paginated-find-many';

vi.mock('@/utils/keyset-paginated-find-many', () => ({
  KeysetPaginatedFindMany: vi.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let drizzleService: any;
  let userRepo: any;
  let redis: any;

  const mockDrizzleService = {
    db: {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
      innerJoin: vi.fn(),
      leftJoin: vi.fn(),
      insert: vi.fn(),
      values: vi.fn(),
      returning: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
    },
    executeTransaction: vi.fn(),
  };

  const mockUserRepository = {
    findUnique: vi.fn(),
    findByEmail: vi.fn(),
  };

  const mockRedisSubscriptionService = {
    publish: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    // Setup chaining for db operations
    mockDrizzleService.db.select.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.from.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.innerJoin.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.leftJoin.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.where.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.limit.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.insert.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.values.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.returning.mockResolvedValue([]);
    mockDrizzleService.db.update.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.set.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.executeTransaction.mockImplementation((cb) =>
      cb(mockDrizzleService.db),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: DrizzleService, useValue: mockDrizzleService },
        { provide: UserRepository, useValue: mockUserRepository },
        {
          provide: RedisSubscriptionService,
          useValue: mockRedisSubscriptionService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    drizzleService = module.get<DrizzleService>(DrizzleService);
    userRepo = module.get<UserRepository>(UserRepository);
    redis = module.get<RedisSubscriptionService>(RedisSubscriptionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
        role: 'USER' as const,
      };
      mockDrizzleService.db.returning.mockResolvedValueOnce([
        { id: '1', ...input },
      ]);

      const result = await service.create(input);

      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
      expect(mockDrizzleService.db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          email: input.email,
          password: expect.not.stringMatching(input.password), // Should be hashed
        }),
      );
      expect(redis.publish).toHaveBeenCalledWith('userAdded', {
        userAdded: input,
      });
      expect(result.id).toBe('1');
    });
  });

  describe('findOne / findByEmail', () => {
    it('should find user by id', async () => {
      mockUserRepository.findUnique.mockResolvedValue({ id: '1' });
      const result = await service.findOne('1');
      expect(mockUserRepository.findUnique).toHaveBeenCalledWith('1');
      expect(result?.id).toBe('1');
    });

    it('should find user by email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        email: 'test@test.com',
      });
      await service.findByEmail('test@test.com');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@test.com',
      );
    });
  });

  describe('OAuth', () => {
    it('should find user by OAuth account', async () => {
      mockDrizzleService.db.limit.mockResolvedValueOnce([
        { user: { id: 'u1' } },
      ]);
      const result = await service.findByOAuthAccount(
        OAuthProvider.GOOGLE,
        'g1',
      );
      expect(result?.id).toBe('u1');
    });

    it('should link OAuth account', async () => {
      mockDrizzleService.db.returning.mockResolvedValueOnce([{ id: 'oa1' }]);
      await service.linkOAuthAccount('u1', OAuthProvider.GOOGLE, 'g1');
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });

    it('should create user with OAuth account', async () => {
      const input = {
        email: 'o@test.com',
        name: 'O',
        provider: OAuthProvider.GOOGLE,
        providerId: 'g1',
      };
      mockDrizzleService.db.returning.mockResolvedValueOnce([{ id: 'u2' }]); // user
      mockDrizzleService.db.returning.mockResolvedValueOnce([{ id: 'oa2' }]); // oauthAccount
      const result = await service.createWithOAuth(input);
      expect(result.id).toBe('u2');
    });
  });

  describe('findMany', () => {
    it('should call keyset paginator', async () => {
      const mockFindMany = vi.fn().mockResolvedValue([]);
      (KeysetPaginatedFindMany as any).mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      await service.findMany({
        paginationArgs: { first: 10, after: null, before: null, last: null },
        searchArgs: { search: '' },
        ordenationArgs: { orderBy: 'id', orderDirection: 'asc' },
      });
      expect(KeysetPaginatedFindMany).toHaveBeenCalled();
      expect(mockFindMany).toHaveBeenCalled();
    });
  });
});
