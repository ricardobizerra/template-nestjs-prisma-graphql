import { ConflictException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUserUseCase } from '@/user/application/use-cases/create-user.use-case';
import { UserRole } from '@/shared/domain/user.types';

describe('CreateUserUseCase', () => {
  const userRepository = { findByEmail: vi.fn(), create: vi.fn() } as any;
  const passwordHasher = { hash: vi.fn().mockResolvedValue('hashed') } as any;
  const eventPublisher = { publishUserCreated: vi.fn() } as any;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateUserUseCase(userRepository, passwordHasher, eventPublisher);
  });

  it('throws conflict if email exists', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: '1' });
    await expect(
      useCase.execute({ email: 'a@a.com', password: 'p', name: 'A', role: UserRole.USER }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates user and publishes event', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({ id: '1' });
    await useCase.execute({ email: 'a@a.com', password: 'p', name: 'A', role: UserRole.USER });
    expect(passwordHasher.hash).toHaveBeenCalledWith('p');
    expect(eventPublisher.publishUserCreated).toHaveBeenCalled();
  });
});
