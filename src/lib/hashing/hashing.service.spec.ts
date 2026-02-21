import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing.service';
import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import * as bcryptjs from 'bcryptjs';

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  genSalt: vi.fn().mockResolvedValue('salt'),
}));

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should hash a password', async () => {
    (bcryptjs.hash as any).mockResolvedValue('hashed_word');
    const res = await service.hash('password', 10);
    expect(res).toBe('hashed_word');
  });

  it('should compare a password', async () => {
    (bcryptjs.compare as any).mockResolvedValue(true);
    const res = await service.compare('password', 'hashed_word');
    expect(res).toBe(true);
  });
});
