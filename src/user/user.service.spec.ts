import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { OAuthProvider } from '@prisma/client';
import { USER_REPOSITORY_PORT } from '@/shared/application/ports/user-repository.port';
import { CreateUserUseCase } from '@/user/application/use-cases/create-user.use-case';

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;
  let createUserUseCase: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY_PORT,
          useValue: {
            findMany: vi.fn(),
            findOne: vi.fn(),
            findByEmail: vi.fn(),
            findByOAuthAccount: vi.fn(),
            linkOAuthAccount: vi.fn(),
            createWithOAuth: vi.fn(),
            update: vi.fn(),
            getAuthMethods: vi.fn(),
          },
        },
        {
          provide: CreateUserUseCase,
          useValue: { execute: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(USER_REPOSITORY_PORT);
    createUserUseCase = module.get(CreateUserUseCase);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate findOne to repository', async () => {
    userRepository.findOne.mockResolvedValue({ id: '1' });
    const result = await service.findOne('1');
    expect(result.id).toBe('1');
  });

  it('should delegate create to create use case', async () => {
    createUserUseCase.execute.mockResolvedValue({ id: '1' });
    const result = await service.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      role: 'USER' as any,
    });
    expect(result.id).toBe('1');
  });

  it('should map and delegate oauth lookup', async () => {
    userRepository.findByOAuthAccount.mockResolvedValue({ id: 'u1' });
    const result = await service.findByOAuthAccount(OAuthProvider.GOOGLE, 'g1');
    expect(result.id).toBe('u1');
  });
});
