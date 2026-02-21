import { describe, it, expect, vi } from 'vitest';
import { AppConfigAdapter } from '@/infrastructure/config/adapters/config.adapter';

describe('AppConfigAdapter', () => {
  it('reads all expected config values', () => {
    const configService = { get: vi.fn((k: string) => ({ NODE_ENV: 'test', JWT_EXPIRES_IN_SECONDS: 3600, REFRESH_TOKEN_EXPIRES_IN_DAYS: 7, REFRESH_TOKEN_SECRET: 'rs', FRONTEND_URL: 'http://localhost:3000' } as any)[k]) } as any;
    const adapter = new AppConfigAdapter(configService);
    expect(adapter.getNodeEnv()).toBe('test');
    expect(adapter.getJwtExpiresInSeconds()).toBe(3600);
    expect(adapter.getRefreshTokenExpiresInDays()).toBe(7);
    expect(adapter.getRefreshTokenSecret()).toBe('rs');
    expect(adapter.getFrontendUrl()).toBe('http://localhost:3000');
  });
});
