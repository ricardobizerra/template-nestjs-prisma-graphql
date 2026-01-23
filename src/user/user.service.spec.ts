import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { OAuthProvider } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let redis: any;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oAuthAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  const mockRedisSubscriptionService = {
    publish: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: RedisSubscriptionService,
          useValue: mockRedisSubscriptionService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
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
      prisma.user.create.mockResolvedValue({ id: '1', ...input });

      const result = await service.create(input);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: input.email,
          password: expect.not.stringMatching(input.password), // Should be hashed
        }),
      });
      expect(redis.publish).toHaveBeenCalledWith('userAdded', {
        userAdded: input,
      });
      expect(result.id).toBe('1');
    });
  });

  describe('findOne / findByEmail', () => {
    it('should find user by id', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      await service.findOne('1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should find user by email', async () => {
      prisma.user.findUnique.mockResolvedValue({ email: 'test@test.com' });
      await service.findByEmail('test@test.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
    });
  });

  describe('OAuth', () => {
    it('should find user by OAuth account', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        user: { id: 'u1' },
      });
      const result = await service.findByOAuthAccount(
        OAuthProvider.GOOGLE,
        'g1',
      );
      expect(result?.id).toBe('u1');
    });

    it('should link OAuth account', async () => {
      await service.linkOAuthAccount('u1', OAuthProvider.GOOGLE, 'g1');
      expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
        data: { userId: 'u1', provider: 'GOOGLE', providerId: 'g1' },
      });
    });

    it('should create user with OAuth account', async () => {
      const input = {
        email: 'o@test.com',
        name: 'O',
        provider: OAuthProvider.GOOGLE,
        providerId: 'g1',
      };
      await service.createWithOAuth(input);
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('should call raw query for keyset pagination', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await service.findMany({
        paginationArgs: { first: 10, after: null, before: null, last: null },
        searchArgs: { search: '' },
        ordenationArgs: { orderBy: 'id', orderDirection: 'asc' },
      });
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
