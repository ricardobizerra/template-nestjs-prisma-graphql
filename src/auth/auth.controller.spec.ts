import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@/auth/presentation/http/auth.controller';
import { HttpStatus } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from '@/shared/application/ports/session-token.port';
import {
  CONFIG_PORT,
  ConfigPort,
} from '@/shared/application/ports/config.port';

describe('AuthController', () => {
  let controller: AuthController;
  let signInUseCase: { execute: ReturnType<typeof vi.fn> };
  let refreshSessionUseCase: { execute: ReturnType<typeof vi.fn> };
  let sessionTokenPort: {
    generateAccessToken: ReturnType<typeof vi.fn>;
    generateRefreshToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: SignInUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: RefreshSessionUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: RequestPasswordResetUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: ResetPasswordUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: AuthCookieService,
          useValue: {
            setTokenCookies: vi.fn(),
            clearTokenCookies: vi.fn(),
          },
        },
        {
          provide: SESSION_TOKEN_PORT,
          useValue: {
            generateAccessToken: vi.fn().mockReturnValue('a'),
            generateRefreshToken: vi.fn().mockReturnValue('r'),
          },
        },
        {
          provide: CONFIG_PORT,
          useValue: {
            getFrontendUrl: vi.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    signInUseCase = module.get(SignInUseCase);
    refreshSessionUseCase = module.get(RefreshSessionUseCase);
    sessionTokenPort = module.get<SessionTokenPort>(SESSION_TOKEN_PORT) as any;
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

  it('should set cookies and return user on signIn', async () => {
    const mockReply = createMockReply();
    signInUseCase.execute.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1', email: 't@t.com' },
    });

    await controller.signIn(
      { username: 't@t.com', password: 'p' },
      mockReply as any,
    );

    expect(signInUseCase.execute).toHaveBeenCalledWith('t@t.com', 'p');
    expect(mockReply.send).toHaveBeenCalledWith({
      user: { id: '1', email: 't@t.com' },
    });
  });

  it('should rotate tokens on refresh', async () => {
    const mockReply = createMockReply();
    refreshSessionUseCase.execute.mockResolvedValue({
      accessToken: 'new-a',
      refreshToken: 'new-r',
    });

    await controller.refresh(
      { cookies: { refreshToken: 'old-r' } } as any,
      mockReply as any,
    );

    expect(refreshSessionUseCase.execute).toHaveBeenCalledWith('old-r');
    expect(mockReply.send).toHaveBeenCalledWith({
      message: 'Token refreshed successfully',
    });
  });

  it('should return 401 if refresh token is missing', async () => {
    const mockReply = createMockReply();

    await controller.refresh({ cookies: {} } as any, mockReply as any);

    expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('should clear cookies on signOut', async () => {
    const mockReply = createMockReply();
    await controller.signOut(mockReply as any);
    expect(mockReply.send).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });

  it('should set tokens and redirect on google callback', async () => {
    const mockReply = createMockReply();
    await controller.googleAuthCallback(
      {
        user: {
          id: '1',
          email: 't@t.com',
          name: 'T',
          role: 'USER',
          tokenVersion: 0,
        },
      } as any,
      mockReply as any,
    );

    expect(sessionTokenPort.generateAccessToken).toHaveBeenCalled();
    expect(sessionTokenPort.generateRefreshToken).toHaveBeenCalled();
    expect(mockReply.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/auth/callback',
    );
  });
});
