import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestPasswordResetUseCase } from '@/auth/application/use-cases/request-password-reset.use-case';

describe('RequestPasswordResetUseCase', () => {
  const userRepository = { findByEmail: vi.fn() } as any;
  const resetTokenRepository = { deleteByUserId: vi.fn(), create: vi.fn() } as any;
  const passwordHasher = { hash: vi.fn().mockResolvedValue('hashed') } as any;
  const mailQueue = { enqueuePasswordReset: vi.fn() } as any;
  let useCase: RequestPasswordResetUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new RequestPasswordResetUseCase(userRepository, resetTokenRepository, passwordHasher, mailQueue);
  });

  it('returns silently for unknown user', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await useCase.execute('x@x.com');
    expect(resetTokenRepository.create).not.toHaveBeenCalled();
  });

  it('returns silently for oauth-only user', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: '1', email: 'x@x.com', password: null });
    await useCase.execute('x@x.com');
    expect(resetTokenRepository.create).not.toHaveBeenCalled();
  });

  it('creates token and queues email', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: '1', email: 'x@x.com', password: 'h' });
    await useCase.execute('x@x.com');
    expect(resetTokenRepository.deleteByUserId).toHaveBeenCalledWith('1');
    expect(resetTokenRepository.create).toHaveBeenCalled();
    expect(mailQueue.enqueuePasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'x@x.com', token: expect.any(String) }),
    );
  });
});
