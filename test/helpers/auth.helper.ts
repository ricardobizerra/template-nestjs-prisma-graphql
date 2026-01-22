import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestUser, CreateUserResult } from './user.factory';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  user: CreateUserResult;
  accessToken: string;
  cookies: string[];
}

/**
 * Creates a test user and authenticates them, returning the access token.
 *
 * @example
 * const { user, accessToken, cookies } = await createAuthenticatedUser(app);
 * await request(app.getHttpServer())
 *   .get('/users/me')
 *   .set('Cookie', cookies)
 *   .expect(200);
 */
export async function createAuthenticatedUser(
  app: INestApplication,
  role: Role = Role.USER,
): Promise<AuthenticatedUser> {
  const user = await createTestUser({ role });

  const response = await request(app.getHttpServer())
    .post('/auth/sign-in')
    .send({
      username: user.email,
      password: user.plainPassword,
    })
    .expect(200);

  // Extract cookies from response (can be string or string[])
  const rawCookies = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies]
      : [];

  // Extract access token from cookies if present
  const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='));
  const accessToken = accessTokenCookie
    ? accessTokenCookie.split(';')[0].replace('accessToken=', '')
    : '';

  return {
    user,
    accessToken,
    cookies,
  };
}

/**
 * Creates an authenticated admin user.
 */
export async function createAuthenticatedAdmin(
  app: INestApplication,
): Promise<AuthenticatedUser> {
  return createAuthenticatedUser(app, Role.ADMIN);
}

/**
 * Helper to set authentication cookies on a supertest request.
 *
 * @example
 * const { cookies } = await createAuthenticatedUser(app);
 * await withAuth(request(app.getHttpServer()).get('/users/me'), cookies)
 *   .expect(200);
 */
export function withAuth(req: request.Test, cookies: string[]): request.Test {
  return req.set('Cookie', cookies);
}

/**
 * Helper to set Bearer token authorization.
 *
 * @example
 * const { accessToken } = await createAuthenticatedUser(app);
 * await withBearer(request(app.getHttpServer()).get('/users/me'), accessToken)
 *   .expect(200);
 */
export function withBearer(
  req: request.Test,
  accessToken: string,
): request.Test {
  return req.set('Authorization', `Bearer ${accessToken}`);
}
