import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtSessionTokenAdapter } from '@/infrastructure/security/adapters/session-token.adapter';

describe('JwtSessionTokenAdapter', () => {
  const configPort = {
    getRefreshTokenSecret: vi.fn().mockReturnValue('secret'),
    getRefreshTokenExpiresInDays: vi.fn().mockReturnValue(7),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    configPort.getRefreshTokenSecret.mockReturnValue('secret');
    configPort.getRefreshTokenExpiresInDays.mockReturnValue(7);
  });

  it('generates access token', () => {
    const jwt = { sign: vi.fn().mockReturnValue('a') } as any;
    const adapter = new JwtSessionTokenAdapter(jwt, configPort);
    expect(
      adapter.generateAccessToken({
        id: '1',
        email: 'a@a.com',
        name: 'A',
        role: 'USER',
        tokenVersion: 1,
      } as any),
    ).toBe('a');
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: '1' }),
    );
  });

  it('generates refresh token with custom secret', () => {
    const jwt = { sign: vi.fn().mockReturnValue('r') } as any;
    const adapter = new JwtSessionTokenAdapter(jwt, configPort);
    expect(
      adapter.generateRefreshToken({ id: '1', tokenVersion: 2 } as any),
    ).toBe('r');
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refresh' }),
      expect.objectContaining({ secret: 'secret' }),
    );
  });

  it('verifies refresh token and throws on invalid token', () => {
    const jwtOk = {
      verify: vi
        .fn()
        .mockReturnValue({ sub: '1', tokenVersion: 1, type: 'refresh' }),
    } as any;
    const okAdapter = new JwtSessionTokenAdapter(jwtOk, configPort);
    expect(okAdapter.verifyRefreshToken('x').sub).toBe('1');

    const jwtFail = {
      verify: vi.fn(() => {
        throw new Error('bad');
      }),
    } as any;
    const failAdapter = new JwtSessionTokenAdapter(jwtFail, configPort);
    expect(() => failAdapter.verifyRefreshToken('x')).toThrow(
      UnauthorizedException,
    );
  });
});
