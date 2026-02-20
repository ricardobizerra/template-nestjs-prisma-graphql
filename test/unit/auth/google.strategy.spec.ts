import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from '@/auth/presentation/strategies/google.strategy';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { OAuthSignInUseCase } from '@/auth/application/use-cases/oauth-sign-in.use-case';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let oauthSignInUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: OAuthSignInUseCase,
          useValue: { execute: vi.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key) => {
              if (key === 'GOOGLE_CLIENT_ID') return 'id';
              if (key === 'GOOGLE_CLIENT_SECRET') return 'secret';
              if (key === 'GOOGLE_CALLBACK_URL') return 'url';
              return null;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    oauthSignInUseCase = module.get(OAuthSignInUseCase);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should call oauth sign-in use case and return user', async () => {
    oauthSignInUseCase.execute.mockResolvedValue({ id: 'u1' });
    const done = vi.fn();

    await strategy.validate(
      'access',
      'refresh',
      {
        id: 'g1',
        emails: [{ value: 'test@gmail.com' }],
        displayName: 'Test User',
      } as any,
      done,
    );

    expect(oauthSignInUseCase.execute).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, { id: 'u1' });
  });
});
