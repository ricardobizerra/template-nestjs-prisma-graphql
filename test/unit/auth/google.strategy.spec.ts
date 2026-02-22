import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from '@/auth/google.strategy';
import { UserService } from '@/user/user.service';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { OAuthProvider } from '@/lib/drizzle/schema';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let userService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: UserService,
          useValue: {
            findByOAuthAccount: vi.fn(),
            findByEmail: vi.fn(),
            linkOAuthAccount: vi.fn(),
            createWithOAuth: vi.fn(),
          },
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
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockProfile = {
      id: 'g1',
      emails: [{ value: 'test@gmail.com' }],
      displayName: 'Test User',
    };

    it('should return user if OAuth account exists', async () => {
      userService.findByOAuthAccount.mockResolvedValue({ id: 'u1' });
      const done = vi.fn();

      await strategy.validate('access', 'refresh', mockProfile as any, done);

      expect(done).toHaveBeenCalledWith(null, { id: 'u1' });
    });

    it('should link to existing user if email matches', async () => {
      userService.findByOAuthAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue({
        id: 'u2',
        email: 'test@gmail.com',
      });
      const done = vi.fn();

      await strategy.validate('access', 'refresh', mockProfile as any, done);

      expect(userService.linkOAuthAccount).toHaveBeenCalledWith(
        'u2',
        OAuthProvider.GOOGLE,
        'g1',
      );
      expect(done).toHaveBeenCalledWith(null, {
        id: 'u2',
        email: 'test@gmail.com',
      });
    });

    it('should create new user if neither OAuth nor email exists', async () => {
      userService.findByOAuthAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.createWithOAuth.mockResolvedValue({ id: 'u3' });
      const done = vi.fn();

      await strategy.validate('access', 'refresh', mockProfile as any, done);

      expect(userService.createWithOAuth).toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(null, { id: 'u3' });
    });

    it('should error if profile has no email', async () => {
      const profileNoEmail = { ...mockProfile, emails: [] };
      const done = vi.fn();

      await strategy.validate('access', 'refresh', profileNoEmail as any, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), undefined);
    });
  });
});
