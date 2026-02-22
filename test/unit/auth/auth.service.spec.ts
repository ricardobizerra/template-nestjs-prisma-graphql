import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@/auth/auth.service';
import { UserService } from '@/user/user.service';
import { HashingService } from '@/lib/hashing/hashing.service';
import { TokenService } from '@/auth/token.service';
import { PasswordResetService } from '@/auth/password-reset.service';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let hashingService: any;
  let tokenService: any;
  let passwordResetService: any;

  const mockUserService = {
    findOne: vi.fn(),
    findByEmail: vi.fn(),
    revokeRefreshTokens: vi.fn(),
  };

  const mockHashingService = {
    hash: vi.fn(),
    compare: vi.fn(),
  };

  const mockTokenService = {
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    refreshAccessToken: vi.fn(),
  };

  const mockPasswordResetService = {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: HashingService, useValue: mockHashingService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PasswordResetService, useValue: mockPasswordResetService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    hashingService = module.get<HashingService>(HashingService);
    tokenService = module.get<TokenService>(TokenService);
    passwordResetService =
      module.get<PasswordResetService>(PasswordResetService);
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
      hashingService.compare.mockResolvedValue(true);

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
      userService.findByEmail.mockResolvedValue({
        id: '1',
        email: 't@t.com',
        password: 'h',
      });
      hashingService.compare.mockResolvedValue(false);
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

  describe('Token methods delegation', () => {
    it('should delegate generateAccessToken', () => {
      tokenService.generateAccessToken.mockReturnValue('token');
      expect(service.generateAccessToken({ id: '1' } as any)).toBe('token');
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should delegate generateRefreshToken', () => {
      tokenService.generateRefreshToken.mockReturnValue('token');
      expect(service.generateRefreshToken({ id: '1' } as any)).toBe('token');
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should delegate verifyRefreshToken', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ id: '1' });
      const res = await service.verifyRefreshToken('token');
      expect(res).toEqual({ id: '1' });
      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('token');
    });

    it('should delegate refreshAccessToken', async () => {
      tokenService.refreshAccessToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const res = await service.refreshAccessToken('token');
      expect(res).toEqual({ accessToken: 'a', refreshToken: 'r' });
      expect(tokenService.refreshAccessToken).toHaveBeenCalledWith('token');
    });
  });

  describe('Revocation', () => {
    it('should delegate revokeAllRefreshTokens to userService', async () => {
      await service.revokeAllRefreshTokens('1');
      expect(userService.revokeRefreshTokens).toHaveBeenCalledWith('1');
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
      hashingService.compare.mockResolvedValue(true);
      tokenService.generateAccessToken.mockReturnValue('access');
      tokenService.generateRefreshToken.mockReturnValue('refresh');

      const result = await service.signIn('t@t.com', 'p');
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.user.id).toBe('1');
    });

    it('should throw if user disappears after validation', async () => {
      const user = { id: '1', email: 't@t.com', password: 'hashed' };
      userService.findByEmail.mockResolvedValue(user);
      userService.findOne.mockResolvedValue(null);
      hashingService.compare.mockResolvedValue(true);

      await expect(service.signIn('t@t.com', 'p')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Password Reset Delegation', () => {
    it('should delegate requestPasswordReset', async () => {
      await service.requestPasswordReset('t@t.com');
      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        't@t.com',
      );
    });

    it('should delegate resetPassword', async () => {
      await service.resetPassword('token', 'new-pass');
      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
        'token',
        'new-pass',
      );
    });
  });
});
