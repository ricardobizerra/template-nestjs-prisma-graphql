import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifyMultipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { requestIdHook } from '@/lib/middleware';

import { randomUUID } from 'crypto';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      genReqId: () => randomUUID(),
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  // Global validation pipe - enables DTO validation with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if unknown properties sent
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert query params to proper types
      },
    }),
  );

  const configService = app.get<ConfigService<Env, true>>(ConfigService);

  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const swaggerAccessKey = configService.get('SWAGGER_ACCESS_KEY');
  const frontendUrl = configService.get('FRONTEND_URL');

  // Get underlying Fastify instance for hooks
  const fastifyInstance = app.getHttpAdapter().getInstance();

  // Decorate Fastify request/reply to work with Passport (required for OAuth)
  // Passport expects Express-style methods that don't exist in Fastify

  // Express-style redirect method
  fastifyInstance.decorateReply('redirect', function (url: string) {
    this.header('Location', url);
    this.code(302);
    this.send();
    return this;
  });

  // Express-style setHeader method (required by passport-oauth2)
  fastifyInstance.decorateReply(
    'setHeader',
    function (name: string, value: string) {
      this.header(name, value);
      return this;
    },
  );

  // Express-style end method
  fastifyInstance.decorateReply('end', function () {
    this.send();
    return this;
  });

  // Passport expects these properties to exist on the request object
  fastifyInstance.decorateRequest('user', null);
  fastifyInstance.decorateRequest('session', null);

  // passport-oauth2 needs req.connection.encrypted to determine protocol
  fastifyInstance.decorateRequest('connection', null);

  // Set connection.encrypted based on the request protocol
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    request.connection = {
      encrypted: request.protocol === 'https',
    };
  });

  // Add request ID to all requests for distributed tracing
  fastifyInstance.addHook('onRequest', requestIdHook);

  const cookieSecret = configService.get('COOKIE_SECRET');
  await app.register(fastifyCookie, {
    secret: cookieSecret,
  });

  // CSRF Protection
  await app.register(fastifyCsrf, {
    cookieOpts: {
      signed: true,
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
      path: '/',
    },
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Enforce CSRF protection for non-safe methods (POST, PUT, PATCH, DELETE)
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(request.method)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      (fastifyInstance as any).csrfProtection(request, reply, (err?: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  // Security headers (CSP disabled in development for Swagger UI)
  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === 'development' ? false : undefined,
  });

  await app.register(fastifyCors, {
    origin:
      nodeEnv === 'development'
        ? [
            'http://localhost:3000',
            'http://localhost:3333',
            'http://127.0.0.1:3000',
          ]
        : frontendUrl,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle(configService.get('APP_NAME'))
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  if (nodeEnv === 'development') {
    // Full Swagger UI in development
    SwaggerModule.setup('api/docs', app, document);
  } else if (swaggerAccessKey) {
    // JSON-only endpoint with access key in staging/production
    app.getHttpAdapter().get('/api/docs-json', (req, reply) => {
      const key = req.query['key'] || req.headers['x-swagger-key'];
      if (key === swaggerAccessKey) {
        reply.send(document);
      } else {
        reply.status(403).send({ message: 'Forbidden' });
      }
    });
  }

  await app.listen(3333, '0.0.0.0');
}
bootstrap();
