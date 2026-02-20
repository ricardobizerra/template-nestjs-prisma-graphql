import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY_PORT } from '@/shared/application/ports/user-repository.port';
import { PASSWORD_HASHER_PORT } from '@/shared/application/ports/password-hasher.port';
import { SESSION_TOKEN_PORT } from '@/shared/application/ports/session-token.port';
import { SignInUseCase } from '@/auth/application/use-cases/sign-in.use-case';
import { RefreshSessionUseCase } from '@/auth/application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/auth/application/use-cases/reset-password.use-case';
import { RevokeAllSessionsUseCase } from '@/auth/application/use-cases/revoke-all-sessions.use-case';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let passwordHasher: any;
  let sessionTokenPort: any;
  let signInUseCase: any;
  let refreshSessionUseCase: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SignInUseCase, useValue: { execute: vi.fn() } },
        { provide: RefreshSessionUseCase, useValue: { execute: vi.fn() } },
        {
          provide: RequestPasswordResetUseCase,
          useValue: { execute: vi.fn() },
        },
        { provide: ResetPasswordUseCase, useValue: { execute: vi.fn() } },
        { provide: RevokeAllSessionsUseCase, useValue: { execute: vi.fn() } },
        {
          provide: USER_REPOSITORY_PORT,
          useValue: {
            findByEmail: vi.fn(),
            findOne: vi.fn(),
          },
        },
        {
          provide: PASSWORD_HASHER_PORT,
          useValue: {
            compare: vi.fn(),
          },
        },
        {
          provide: SESSION_TOKEN_PORT,
          useValue: {
            generateAccessToken: vi.fn().mockReturnValue('access-token'),
            generateRefreshToken: vi.fn().mockReturnValue('refresh-token'),
            verifyRefreshToken: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(USER_REPOSITORY_PORT);
    passwordHasher = module.get(PASSWORD_HASHER_PORT);
    sessionTokenPort = module.get(SESSION_TOKEN_PORT);
    signInUseCase = module.get(SignInUseCase);
    refreshSessionUseCase = module.get(RefreshSessionUseCase);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validateEmailAndPassword should throw when user is missing', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await expect(
      service.validateEmailAndPassword('t@t.com', 'p'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validateEmailAndPassword should return user model when valid', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 't@t.com',
      name: 'N',
      role: 'USER',
      password: 'hashed',
    });
    passwordHasher.compare.mockResolvedValue(true);

    const result = await service.validateEmailAndPassword('t@t.com', 'p');
    expect(result.id).toBe('1');
  });

  it('signIn should delegate to use case', async () => {
    signInUseCase.execute.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1' },
    });

    const result = await service.signIn('t@t.com', 'p');
    expect(result.accessToken).toBe('a');
  });

  it('refreshAccessToken should delegate to use case', async () => {
    refreshSessionUseCase.execute.mockResolvedValue({
      accessToken: 'new-a',
      refreshToken: 'new-r',
    });

    const result = await service.refreshAccessToken('old-r');
    expect(result.refreshToken).toBe('new-r');
  });

  it('generateAccessToken should call session token port', () => {
    service.generateAccessToken({
      id: '1',
      email: 't',
      name: 'n',
      role: 'USER',
    } as any);
    expect(sessionTokenPort.generateAccessToken).toHaveBeenCalled();
  });
});
