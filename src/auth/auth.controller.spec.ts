import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    signIn: ReturnType<typeof vi.fn>;
    generateAccessToken: ReturnType<typeof vi.fn>;
    generateRefreshToken: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockResponse: Partial<FastifyReply>;

  beforeEach(async () => {
    mockAuthService = {
      signIn: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          role: 'USER',
        },
      }),
      generateAccessToken: vi.fn().mockReturnValue('generated-access-token'),
      generateRefreshToken: vi.fn().mockReturnValue('generated-refresh-token'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_EXPIRES_IN_SECONDS') return 900;
        if (key === 'REFRESH_TOKEN_EXPIRES_IN_DAYS') return 7;
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should sign in a user and set cookies', async () => {
    await controller.signIn(
      { username: 'test@example.com', password: 'password123' },
      mockResponse as FastifyReply,
    );

    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
    // Should set both access and refresh token cookies
    expect(mockResponse.setCookie).toHaveBeenCalledWith(
      'accessToken',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(mockResponse.setCookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth',
      }),
    );
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it('should sign out and clear cookies', async () => {
    await controller.signOut(mockResponse as FastifyReply);

    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth',
      }),
    );
    expect(mockResponse.send).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });
});
