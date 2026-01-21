import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  const configService = app.get<ConfigService<Env, true>>(ConfigService);

  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const swaggerAccessKey = configService.get('SWAGGER_ACCESS_KEY');
  const frontendUrl = configService.get('FRONTEND_URL');

  await app.register(fastifyCookie);

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
