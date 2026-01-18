import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthService } from '@/auth/auth.service';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    findMany: vi.fn().mockResolvedValue({ edges: [], pageInfo: {} }),
    findOne: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
  };

  const mockAuthService = {
    signIn: vi.fn().mockResolvedValue({ accessToken: 'token' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
