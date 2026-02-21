import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let configService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: vi.fn(),
            refreshAccessToken: vi.fn(),
            generateAccessToken: vi.fn().mockReturnValue('a'),
            generateRefreshToken: vi.fn().mockReturnValue('r'),
            requestPasswordReset: vi.fn(),
            resetPassword: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              if (key === 'JWT_EXPIRES_IN_SECONDS') return 3600;
              if (key === 'REFRESH_TOKEN_EXPIRES_IN_DAYS') return 7;
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  const createMockReply = () => ({
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should set cookies and return user', async () => {
      const mockReply = createMockReply();
      const result = {
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: '1', email: 't@t.com' },
      };
      authService.signIn.mockResolvedValue(result);

      await controller.signIn(
        { username: 't@t.com', password: 'p' },
        mockReply as any,
      );

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        'accessToken',
        'a',
        expect.any(Object),
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        'r',
        expect.any(Object),
      );
      expect(mockReply.send).toHaveBeenCalledWith({ user: result.user });
    });
  });

  describe('refresh', () => {
    it('should rotate tokens if refresh token exists', async () => {
      const mockReply = createMockReply();
      const req = { cookies: { refreshToken: 'old-r' } };
      authService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-a',
        refreshToken: 'new-r',
      });

      await controller.refresh(req as any, mockReply as any);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        'accessToken',
        'new-a',
        expect.any(Object),
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Token refreshed successfully',
      });
    });

    it('should return 401 if refresh token missing', async () => {
      const mockReply = createMockReply();
      const req = { cookies: {} };
      await controller.refresh(req as any, mockReply as any);
      expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockReply.send).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should clear cookies', async () => {
      const mockReply = createMockReply();
      await controller.signOut(mockReply as any);
      expect(mockReply.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('Google OAuth Callback', () => {
    it('should set cookies and redirect', async () => {
      const mockReply = createMockReply();
      const req = { user: { id: '1', email: 't@t.com' } };
      await controller.googleAuthCallback(req as any, mockReply as any);

      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(mockReply.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback',
      );
    });
  });
});
