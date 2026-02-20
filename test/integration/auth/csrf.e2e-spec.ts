import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';
import { beforeEach, it, describe, expect, afterAll } from 'vitest';
import request from 'supertest';

describe('CSRF Protection (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const configService = app.get(ConfigService);
    const cookieSecret = configService.get('COOKIE_SECRET') || 'test-secret';

    const fastifyInstance = app.getHttpAdapter().getInstance();

    await app.register(fastifyCookie, {
      secret: cookieSecret,
    });

    await app.register(fastifyCsrf, {
      cookieOpts: {
        signed: true,
        httpOnly: true,
        path: '/',
      },
    });

    // Mirror the hook from main.ts
    fastifyInstance.addHook('onRequest', async (req, reply) => {
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (safeMethods.includes(req.method)) {
        return;
      }
      await (fastifyInstance as any).csrfProtection(req, reply);
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow GET requests without CSRF token', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
  });

  it('should block POST requests without CSRF token', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/Missing csrf secret/i);
  });

  it('should allow POST requests with valid CSRF token and cookie', async () => {
    // 1. Get the token and cookie
    const csrfResponse = await request(app.getHttpServer()).get('/auth/csrf');
    expect(csrfResponse.status).toBe(200);

    const token = csrfResponse.body.csrfToken;
    const cookies = csrfResponse.get('Set-Cookie');

    // 2. Send the POST request with the token and cookie
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', cookies)
      .set('x-csrf-token', token)
      .send({
        email: 'csrf-test@example.com',
        password: 'Password123!',
        name: 'CSRF Test',
        role: 'USER',
      });

    // If it passes CSRF, it might still fail business logic (e.g. 409 Conflict)
    // but not with 403 Forbidden (CSRF)
    expect(response.status).not.toBe(403);
  });

  it('should block POST requests with invalid CSRF token', async () => {
    const csrfResponse = await request(app.getHttpServer()).get('/auth/csrf');
    const cookies = csrfResponse.get('Set-Cookie');

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', cookies)
      .set('x-csrf-token', 'invalid-token')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/Invalid csrf token/i);
  });
});
