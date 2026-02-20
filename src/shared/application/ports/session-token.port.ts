import { UserRecord } from '@/shared/domain/user.types';

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  type: 'refresh';
}

export const SESSION_TOKEN_PORT = Symbol('SESSION_TOKEN_PORT');

export interface SessionTokenPort {
  generateAccessToken(user: UserRecord): string;
  generateRefreshToken(user: UserRecord): string;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
