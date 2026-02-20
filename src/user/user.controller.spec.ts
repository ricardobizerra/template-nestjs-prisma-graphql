import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '@/user/presentation/http/user.controller';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { ListUsersUseCase } from '@/user/application/use-cases/list-users.use-case';
import { GetMeUseCase } from '@/user/application/use-cases/get-me.use-case';
import { UpdateProfileUseCase } from '@/user/application/use-cases/update-profile.use-case';
import { UploadAvatarUseCase } from '@/user/application/use-cases/upload-avatar.use-case';
import { GetAuthMethodsUseCase } from '@/user/application/use-cases/get-auth-methods.use-case';
import { CreateUserUseCase } from '@/user/application/use-cases/create-user.use-case';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';

describe('UserController', () => {
  let controller: UserController;
  let listUsersUseCase: { execute: ReturnType<typeof vi.fn> };
  let getMeUseCase: { execute: ReturnType<typeof vi.fn> };
  let createUserUseCase: { execute: ReturnType<typeof vi.fn> };
  let signInUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: ListUsersUseCase, useValue: { execute: vi.fn() } },
        { provide: GetMeUseCase, useValue: { execute: vi.fn() } },
        { provide: UpdateProfileUseCase, useValue: { execute: vi.fn() } },
        { provide: UploadAvatarUseCase, useValue: { execute: vi.fn() } },
        { provide: GetAuthMethodsUseCase, useValue: { execute: vi.fn() } },
        { provide: CreateUserUseCase, useValue: { execute: vi.fn() } },
        { provide: SignInUseCase, useValue: { execute: vi.fn() } },
        {
          provide: AuthCookieService,
          useValue: {
            setTokenCookies: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    listUsersUseCase = module.get(ListUsersUseCase);
    getMeUseCase = module.get(GetMeUseCase);
    createUserUseCase = module.get(CreateUserUseCase);
    signInUseCase = module.get(SignInUseCase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return current user profile', async () => {
    getMeUseCase.execute.mockResolvedValue({ id: '1', email: 't@t.com' });

    const result = await controller.findOne({ id: '1' } as any);

    expect(result).toEqual({ id: '1', email: 't@t.com' });
    expect(getMeUseCase.execute).toHaveBeenCalledWith('1');
  });

  it('should return paginated users', async () => {
    listUsersUseCase.execute.mockResolvedValue({ edges: [], pageInfo: {} });

    const result = await controller.findMany('10');

    expect(result).toEqual({ edges: [], pageInfo: {} });
  });

  it('should create user and sign in', async () => {
    const reply = { send: vi.fn().mockReturnThis() };
    createUserUseCase.execute.mockResolvedValue({
      id: '1',
      email: 't@t.com',
      name: 'N',
      role: 'USER',
    });
    signInUseCase.execute.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1', email: 't@t.com' },
    });

    await controller.create(
      {
        email: 't@t.com',
        password: 'p',
        name: 'N',
        role: 'USER',
      } as any,
      reply as any,
    );

    expect(createUserUseCase.execute).toHaveBeenCalled();
    expect(signInUseCase.execute).toHaveBeenCalledWith('t@t.com', 'p');
    expect(reply.send).toHaveBeenCalledWith({
      user: { id: '1', email: 't@t.com' },
    });
  });
});
