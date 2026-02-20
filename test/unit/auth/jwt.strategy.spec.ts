import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '@/auth/presentation/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GetCurrentUserUseCase } from '@/auth/application/use-cases/get-current-user.use-case';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let getCurrentUserUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: GetCurrentUserUseCase,
          useValue: { execute: vi.fn() },
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
    getCurrentUserUseCase = module.get(GetCurrentUserUseCase);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user', async () => {
    getCurrentUserUseCase.execute.mockResolvedValue({
      id: '1',
      email: 't@t.com',
    });
    const result = await strategy.validate({
      sub: '1',
      email: 't@t.com',
    } as any);

    expect(result.id).toBe('1');
    expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith('1');
  });
});
