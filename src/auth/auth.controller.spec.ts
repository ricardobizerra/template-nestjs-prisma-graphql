import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: { signIn: ReturnType<typeof vi.fn> };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    mockAuthService = {
      signIn: vi.fn().mockResolvedValue({
        accessToken: 'token',
        user: { id: '1', email: 'test@example.com' },
      }),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_EXPIRES_IN_SECONDS') return 3600;
        return null;
      }),
    };

    mockResponse = {
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
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
      mockResponse as Response,
    );

    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      'accessToken',
      'token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      accessToken: 'token',
      user: { id: '1', email: 'test@example.com' },
    });
  });

  it('should sign out and clear cookie', async () => {
    await controller.signOut(mockResponse as Response);

    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });
});
