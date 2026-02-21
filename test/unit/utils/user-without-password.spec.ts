import { describe, it, expect } from 'vitest';
import { userWithoutPassword } from '@/utils/user-without-password';

describe('userWithoutPassword', () => {
  it('removes password field', () => {
    const user = {
      id: '1',
      email: 'a@a.com',
      name: 'A',
      role: 'USER',
      password: 'secret',
    } as any;
    const result = userWithoutPassword(user);
    expect((result as any).password).toBeUndefined();
    expect(result.email).toBe('a@a.com');
  });
});
