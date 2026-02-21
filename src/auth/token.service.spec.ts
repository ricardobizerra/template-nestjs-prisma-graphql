import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/user/user.service';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

describe('TokenService', () => {
  let service: TokenService;
  let userService: any;
  let jwtService: any;

  const mockUserService = {
    findOne: vi.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      await expect(service.verifyRefreshToken('token')).rejects.toThrow('Invalid token type');
    });

    it('should throw if user not found during refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: '1', type: 'refresh' });
      userService.findOne.mockResolvedValue(null);
      await expect(service.verifyRefreshToken('token')).rejects.toThrow('User not found');
    });

    it('should throw if tokenVersion mismatch (revoked)', async () => {
      jwtService.verify.mockReturnValue({ sub: '1', tokenVersion: 0, type: 'refresh' });
      userService.findOne.mockResolvedValue({ id: '1', tokenVersion: 1 });

      await expect(service.verifyRefreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if jwt verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error();
      });
      await expect(service.verifyRefreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh both tokens', async () => {
      const user = { id: '1', email: 't@t.com', tokenVersion: 0 };
      vi.spyOn(service, 'verifyRefreshToken').mockResolvedValue(user as any);

      const result = await service.refreshAccessToken('old-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
