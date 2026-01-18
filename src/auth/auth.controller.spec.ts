import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: { signIn: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = {
      signIn: vi.fn().mockResolvedValue({ accessToken: 'token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should sign in a user', async () => {
    const result = await controller.signIn({
      username: 'test@example.com',
      password: 'password123',
    });

    expect(result).toEqual({ accessToken: 'token' });
    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
  });
});
