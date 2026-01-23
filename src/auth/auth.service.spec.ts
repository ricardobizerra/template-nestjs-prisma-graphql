import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/user/user.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  genSalt: vi.fn().mockResolvedValue('salt'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let jwtService: any;
  let prisma: any;
  let emailQueue: any;

  const mockUserService = {
    findOne: vi.fn(),
    findByEmail: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'REFRESH_TOKEN_EXPIRES_IN_DAYS') return 7;
      if (key === 'REFRESH_TOKEN_SECRET') return 'test-refresh-secret';
      return 'secret';
    }),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
    emailQueue = module.get<any>(getQueueToken('email'));

    // Set default mock values that might be reset
    mockJwtService.sign.mockReturnValue('mock-token');
    mockConfigService.get.mockImplementation((key: string): any => {
      if (key === 'REFRESH_TOKEN_EXPIRES_IN_DAYS') return 7;
      if (key === 'REFRESH_TOKEN_SECRET') return 'test-refresh-secret';
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return 'secret';
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEmailAndPassword', () => {
    it('should return user without password on success', async () => {
      const user = {
        id: '1',
        email: 't@t.com',
        password: 'hashed',
        role: 'USER',
      };
      userService.findByEmail.mockResolvedValue(user);
      (compare as any).mockResolvedValue(true);

      const result = await service.validateEmailAndPassword('t@t.com', 'pass');

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);
      await expect(
        service.validateEmailAndPassword('t@t.com', 'p'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has no password (OAuth-only)', async () => {
      userService.findByEmail.mockResolvedValue({ id: '1', email: 't@t.com' });
      await expect(
        service.validateEmailAndPassword('t@t.com', 'p'),
      ).rejects.toThrow('This account uses OAuth login');
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      userService.findByEmail.mockResolvedValue({ password: 'h' });
      (compare as any).mockResolvedValue(false);

      await expect(
        service.validateEmailAndPassword('t@t.com', 'p'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUserId', () => {
    it('should return user on success', async () => {
      userService.findOne.mockResolvedValue({ id: '1', email: 't@t.com' });
      const result = await service.validateUserId('1');
      expect(result.id).toBe('1');
    });

    it('should throw if user not found', async () => {
      userService.findOne.mockResolvedValue(null);
      await expect(service.validateUserId('1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('AccessToken Generation', () => {
    it('should generate a token with correct payload', () => {
      const user = { id: '1', email: 't@t.com', name: 'N', role: 'USER' };
      service.generateAccessToken(user as any);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 't@t.com',
        name: 'N',
        role: 'USER',
      });
    });
  });

  describe('RefreshToken Logic', () => {
    it('should verify and return user if token is valid', async () => {
      const payload = { sub: '1', tokenVersion: 0, type: 'refresh' };
      jwtService.verify.mockReturnValue(payload);
      userService.findOne.mockResolvedValue({ id: '1', tokenVersion: 0 });

      const result = await service.verifyRefreshToken('token');
      expect(result.id).toBe('1');
    });

    it('should throw if token type is not refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: '1', type: 'access' });
      await expect(service.verifyRefreshToken('token')).rejects.toThrow(
        'Invalid token type',
      );
    });

    it('should throw if user not found during refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: '1', type: 'refresh' });
      userService.findOne.mockResolvedValue(null);
      await expect(service.verifyRefreshToken('token')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw if tokenVersion mismatch (revoked)', async () => {
      jwtService.verify.mockReturnValue({
        sub: '1',
        tokenVersion: 0,
        type: 'refresh',
      });
      userService.findOne.mockResolvedValue({ id: '1', tokenVersion: 1 });

      await expect(service.verifyRefreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if jwt verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error();
      });
      await expect(service.verifyRefreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should refresh both tokens', async () => {
      const user = { id: '1', email: 't@t.com', tokenVersion: 0 };
      vi.spyOn(service, 'verifyRefreshToken').mockResolvedValue(user as any);

      const result = await service.refreshAccessToken('old-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('Revocation', () => {
    it('should increment tokenVersion', async () => {
      await service.revokeAllRefreshTokens('1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });

  describe('SignIn', () => {
    it('should return tokens and user', async () => {
      const user = {
        id: '1',
        email: 't@t.com',
        password: 'hashed',
        tokenVersion: 0,
      };
      userService.findByEmail.mockResolvedValue(user);
      userService.findOne.mockResolvedValue(user);
      (compare as any).mockResolvedValue(true);

      const result = await service.signIn('t@t.com', 'p');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user.id).toBe('1');
    });

    it('should throw if user disappears after validation', async () => {
      const user = { id: '1', email: 't@t.com', password: 'hashed' };
      userService.findByEmail.mockResolvedValue(user);
      userService.findOne.mockResolvedValue(null);
      (compare as any).mockResolvedValue(true);

      await expect(service.signIn('t@t.com', 'p')).rejects.toThrow(
        UnauthorizedException,
      );
    });
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
      (compare as any).mockResolvedValue(true);
      (hash as any).mockResolvedValue('new-hashed-pass');

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
