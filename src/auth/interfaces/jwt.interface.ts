import type { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';

export interface JwtPayload extends BaseJwtPayload {
  sub: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  tokenVersion: number;
  type: 'refresh';
}
