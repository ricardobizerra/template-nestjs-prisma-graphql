import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetService } from '@/auth/password-reset.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { UserService } from '@/user/user.service';
import { HashingService } from '@/lib/hashing/hashing.service';
import { getQueueToken } from '@nestjs/bullmq';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userService: any;
  let prisma: any;
  let emailQueue: any;
  let hashingService: any;

  const mockUserService = {
    findByEmail: vi.fn(),
  };

  const mockPrismaService = {
    passwordResetToken: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UserService, useValue: mockUserService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
        { provide: HashingService, useValue: mockHashingService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    userService = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
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
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should return early if user has no password (silent failure)', async () => {
      userService.findByEmail.mockResolvedValue({ id: '1', email: 't@t.com' });
      await service.requestPasswordReset('t@t.com');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should queue email if user exists', async () => {
      userService.findByEmail.mockResolvedValue({
        id: '1',
        email: 't@t.com',
        password: 'h',
      });

      await service.requestPasswordReset('t@t.com');

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(emailQueue.add).toHaveBeenCalledWith(
        'password-reset',
        expect.any(Object),
      );
    });

    it('should update password on reset', async () => {
      const mockToken = { userId: '1', token: 'hashed-token', id: 't1' };
      prisma.passwordResetToken.findMany.mockResolvedValue([mockToken]);
      hashingService.compare.mockResolvedValue(true);
      hashingService.hash.mockResolvedValue('new-hashed-pass');

      await service.resetPassword('plain-token', 'new-pass');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            password: 'new-hashed-pass',
            tokenVersion: { increment: 1 },
          }),
        }),
      );
      expect(prisma.passwordResetToken.delete).toHaveBeenCalled();
    });

    it('should throw if token invalid', async () => {
      prisma.passwordResetToken.findMany.mockResolvedValue([]);
      await expect(service.resetPassword('t', 'p')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
