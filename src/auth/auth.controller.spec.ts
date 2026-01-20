import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    signIn: ReturnType<typeof vi.fn>;
    generateToken: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockResponse: Partial<FastifyReply>;

  beforeEach(async () => {
    mockAuthService = {
      signIn: vi.fn().mockResolvedValue({
        accessToken: 'token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          role: 'USER',
        },
      }),
      generateToken: vi.fn().mockReturnValue('generated-token'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_EXPIRES_IN_SECONDS') return 3600;
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

  it('should sign in a user and set cookie', async () => {
    await controller.signIn(
      { username: 'test@example.com', password: 'password123' },
      mockResponse as FastifyReply,
    );

    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
    expect(mockAuthService.generateToken).toHaveBeenCalled();
    expect(mockResponse.setCookie).toHaveBeenCalledWith(
      'accessToken',
      'generated-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it('should sign out and clear cookie', async () => {
    await controller.signOut(mockResponse as FastifyReply);

    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(mockResponse.send).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });
});
