import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/env';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService<Env, true>>(ConfigService);

  const nodeEnv = configService.get('NODE_ENV', { infer: true });

  app.use(cookieParser());

  app.enableCors({
    origin:
      nodeEnv === 'development' ? true : configService.get('FRONTEND_URL'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true, // Required for cookies
  });

  await app.listen(3333);
}
bootstrap();
