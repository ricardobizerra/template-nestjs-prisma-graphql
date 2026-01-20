import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService<Env, true>>(ConfigService);

  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const swaggerAccessKey = configService.get('SWAGGER_ACCESS_KEY');

  app.use(cookieParser());

  app.enableCors({
    origin:
      nodeEnv === 'development' ? true : configService.get('FRONTEND_URL'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
    app.use(
      '/api/docs-json',
      (req: Request, res: Response, next: NextFunction) => {
        const key = req.query['key'] || req.headers['x-swagger-key'];
        if (key === swaggerAccessKey) {
          res.json(document);
        } else {
          res.status(403).json({ message: 'Forbidden' });
        }
      },
    );
  }

  await app.listen(3333);
}
bootstrap();
