import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@/auth/presentation/http/auth.controller';
import { FastifyReply, FastifyRequest } from 'fastify';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';
import { SESSION_TOKEN_PORT } from '@/shared/application/ports/session-token.port';
import { CONFIG_PORT } from '@/shared/application/ports/config.port';

describe('Auth Security', () => {
  let controller: AuthController;
  let mockSignInUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockRefreshUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockCookieService: { setTokenCookies: ReturnType<typeof vi.fn> };
  let mockResponse: Partial<FastifyReply>;

  beforeEach(async () => {
    mockSignInUseCase = {
      execute: vi.fn().mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          role: 'USER',
        },
      }),
    };

    mockRefreshUseCase = {
      execute: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    };

    mockCookieService = {
      setTokenCookies: vi.fn(),
    };

    mockResponse = {
      setCookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: SignInUseCase, useValue: mockSignInUseCase },
        { provide: RefreshSessionUseCase, useValue: mockRefreshUseCase },
        {
          provide: RequestPasswordResetUseCase,
          useValue: { execute: vi.fn() },
        },
        { provide: ResetPasswordUseCase, useValue: { execute: vi.fn() } },
        { provide: AuthCookieService, useValue: mockCookieService },
        {
          provide: SESSION_TOKEN_PORT,
          useValue: {
            generateAccessToken: vi
              .fn()
              .mockReturnValue('generated-access-token'),
            generateRefreshToken: vi
              .fn()
              .mockReturnValue('generated-refresh-token'),
          },
        },
        {
          provide: CONFIG_PORT,
          useValue: {
            getFrontendUrl: vi.fn().mockReturnValue('https://example.com'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should not return access token in sign-in response body', async () => {
    await controller.signIn(
      { username: 'test@example.com', password: 'password123' },
      mockResponse as FastifyReply,
    );

    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.not.objectContaining({ accessToken: expect.any(String) }),
    );
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ email: 'test@example.com' }),
      }),
    );
  });

  it('should rotate both tokens on refresh', async () => {
    const mockRequest = {
      cookies: { refreshToken: 'old-refresh-token' },
    } as unknown as FastifyRequest;
    await controller.refresh(mockRequest, mockResponse as FastifyReply);

    expect(mockRefreshUseCase.execute).toHaveBeenCalledWith(
      'old-refresh-token',
    );
    expect(mockCookieService.setTokenCookies).toHaveBeenCalled();
  });

  it('should validate strong password policy', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'valid-token',
      newPassword: 'ValidPass1!',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should return csrf token', async () => {
    const mockRes = {
      ...mockResponse,
      generateCsrf: vi.fn().mockReturnValue('mocked-csrf-token'),
      send: vi.fn().mockImplementation((val) => val),
    } as unknown as FastifyReply;

    await controller.getCsrfToken(mockRes);
    expect(mockRes.send).toHaveBeenCalledWith({
      csrfToken: 'mocked-csrf-token',
    });
  });
});
