import { describe, it, expect, vi } from 'vitest';
import { AuthCookieService } from '@/shared/infrastructure/http/auth-cookie.service';

describe('AuthCookieService', () => {
  it('sets and clears cookies with proper options', () => {
    const configPort = {
      getNodeEnv: vi.fn().mockReturnValue('production'),
      getJwtExpiresInSeconds: vi.fn().mockReturnValue(900),
      getRefreshTokenExpiresInDays: vi.fn().mockReturnValue(7),
    } as any;
    const reply = {
      setCookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    } as any;

    const service = new AuthCookieService(configPort);
    service.setTokenCookies(reply, 'a', 'r');
    service.clearTokenCookies(reply);

    expect(reply.setCookie).toHaveBeenCalledTimes(2);
    expect(reply.clearCookie).toHaveBeenCalledTimes(2);
  });
});
