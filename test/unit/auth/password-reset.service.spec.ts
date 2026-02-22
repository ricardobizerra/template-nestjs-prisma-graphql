import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetService } from '@/auth/password-reset.service';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import { UserService } from '@/user/user.service';
import { HashingService } from '@/lib/hashing/hashing.service';
import { getQueueToken } from '@nestjs/bullmq';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userService: any;
  let drizzleService: any;
  let emailQueue: any;
  let hashingService: any;

  const mockUserService = {
    findByEmail: vi.fn(),
  };

  const mockDrizzleService = {
    db: {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
      values: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
    },
  };

  const mockEmailQueue = {
    add: vi.fn(),
  };

  const mockHashingService = {
    hash: vi.fn().mockResolvedValue('hashed-token'),
    compare: vi.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    // Setup query builder chaining
    mockDrizzleService.db.select.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.from.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.where.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.delete.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.insert.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.values.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.update.mockReturnValue(mockDrizzleService.db);
    mockDrizzleService.db.set.mockReturnValue(mockDrizzleService.db);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UserService, useValue: mockUserService },
        { provide: DrizzleService, useValue: mockDrizzleService },
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
        { provide: HashingService, useValue: mockHashingService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    userService = module.get<UserService>(UserService);
    drizzleService = module.get<DrizzleService>(DrizzleService);
    emailQueue = module.get<any>(getQueueToken('email'));
    hashingService = module.get<HashingService>(HashingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Reset Flow', () => {
    it('should return early if user not found (silent failure)', async () => {
      userService.findByEmail.mockResolvedValue(null);
      await service.requestPasswordReset('t@t.com');
      expect(mockDrizzleService.db.insert).not.toHaveBeenCalled();
    });

    it('should return early if user has no password (silent failure)', async () => {
      userService.findByEmail.mockResolvedValue({ id: '1', email: 't@t.com' });
      await service.requestPasswordReset('t@t.com');
      expect(mockDrizzleService.db.insert).not.toHaveBeenCalled();
    });

    it('should queue email if user exists', async () => {
      userService.findByEmail.mockResolvedValue({
        id: '1',
        email: 't@t.com',
        password: 'h',
      });

      await service.requestPasswordReset('t@t.com');

      expect(mockDrizzleService.db.delete).toHaveBeenCalled();
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
      expect(emailQueue.add).toHaveBeenCalledWith(
        'password-reset',
        expect.any(Object),
      );
    });

    it('should update password on reset', async () => {
      const mockToken = { userId: '1', token: 'hashed-token', id: 't1' };
      mockDrizzleService.db.where.mockResolvedValueOnce([mockToken]); // select where matching tokens
      mockDrizzleService.db.where.mockResolvedValueOnce(undefined); // token deletion

      hashingService.compare.mockResolvedValue(true);
      hashingService.hash.mockResolvedValue('new-hashed-pass');

      await service.resetPassword('plain-token', 'new-pass');

      expect(mockDrizzleService.db.update).toHaveBeenCalled();
      expect(mockDrizzleService.db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'new-hashed-pass',
        }),
      );
      expect(mockDrizzleService.db.delete).toHaveBeenCalled();
    });

    it('should throw if token invalid', async () => {
      mockDrizzleService.db.where.mockResolvedValue([]);
      await expect(service.resetPassword('t', 'p')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
