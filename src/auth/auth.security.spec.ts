import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('Auth Security', () => {
  let controller: AuthController;
  let mockAuthService: {
    signIn: ReturnType<typeof vi.fn>;
    refreshAccessToken: ReturnType<typeof vi.fn>;
    generateAccessToken: ReturnType<typeof vi.fn>;
    generateRefreshToken: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockResponse: Partial<FastifyReply>;

  beforeEach(async () => {
    mockAuthService = {
      signIn: vi.fn().mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          role: 'USER',
        },
      }),
      refreshAccessToken: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
      generateAccessToken: vi.fn().mockReturnValue('generated-access-token'),
      generateRefreshToken: vi.fn().mockReturnValue('generated-refresh-token'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_EXPIRES_IN_SECONDS') return 900;
        if (key === 'REFRESH_TOKEN_EXPIRES_IN_DAYS') return 7;
        if (key === 'FRONTEND_URL') return 'https://example.com';
        return null;
      }),
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
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('Token Response Security', () => {
    it('should not return access token in sign-in response body', async () => {
      await controller.signIn(
        { username: 'test@example.com', password: 'password123' },
        mockResponse as FastifyReply,
      );

      // Check that send was called with an object that does NOT contain accessToken
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.not.objectContaining({ accessToken: expect.any(String) }),
      );

      // Verify user is returned
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ email: 'test@example.com' }),
        }),
      );
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate both access and refresh tokens on refresh', async () => {
      const mockRequest = {
        cookies: { refreshToken: 'old-refresh-token' },
      } as unknown as FastifyRequest;

      await controller.refresh(mockRequest, mockResponse as FastifyReply);

      // Verify refreshAccessToken returns both tokens
      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );

      // Verify setCookie is called twice (once for access, once for refresh)
      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('Cookie Security', () => {
    it('should set HttpOnly flag on token cookies', async () => {
      await controller.signIn(
        { username: 'test@example.com', password: 'password123' },
        mockResponse as FastifyReply,
      );

      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );

      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('should set Secure flag in production', async () => {
      await controller.signIn(
        { username: 'test@example.com', password: 'password123' },
        mockResponse as FastifyReply,
      );

      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.objectContaining({ secure: true }),
      );
    });

    it('should set SameSite=strict in production', async () => {
      await controller.signIn(
        { username: 'test@example.com', password: 'password123' },
        mockResponse as FastifyReply,
      );

      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.objectContaining({ sameSite: 'strict' }),
      );
    });

    it('should restrict refresh token to /auth path', async () => {
      await controller.signIn(
        { username: 'test@example.com', password: 'password123' },
        mockResponse as FastifyReply,
      );

      expect(mockResponse.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ path: '/auth' }),
      );
    });
  });

  describe('Password Policy', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        newPassword: 'Short1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
    });

    it('should reject passwords without uppercase', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        newPassword: 'lowercase1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject passwords without lowercase', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        newPassword: 'UPPERCASE1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject passwords without numbers', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        newPassword: 'NoNumbers',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid strong passwords', async () => {
      const dto = plainToInstance(ResetPasswordDto, {
        token: 'valid-token',
        newPassword: 'ValidPass1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
