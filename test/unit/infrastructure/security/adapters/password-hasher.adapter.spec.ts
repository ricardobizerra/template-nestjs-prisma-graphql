import { describe, it, expect } from 'vitest';
import { BcryptPasswordHasherAdapter } from '@/infrastructure/security/adapters/password-hasher.adapter';

describe('BcryptPasswordHasherAdapter', () => {
  it('hashes and compares password', async () => {
    const adapter = new BcryptPasswordHasherAdapter();
    const hashed = await adapter.hash('secret');
    expect(hashed).not.toBe('secret');
    await expect(adapter.compare('secret', hashed)).resolves.toBe(true);
    await expect(adapter.compare('wrong', hashed)).resolves.toBe(false);
  });
});
