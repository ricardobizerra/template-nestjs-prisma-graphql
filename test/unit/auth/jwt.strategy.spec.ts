import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '@/auth/jwt.strategy';
import { AuthService } from '@/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUserId: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return user', async () => {
      const payload = { sub: '1', email: 't@t.com' };
      authService.validateUserId.mockResolvedValue({
        id: '1',
        email: 't@t.com',
      });

      const result = await strategy.validate(payload as any);

      expect(result.id).toBe('1');
      expect(authService.validateUserId).toHaveBeenCalledWith('1');
    });
  });
});
