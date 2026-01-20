import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '@/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  console.log('[Worker] Started and listening for jobs...');

  // Keep the process running
  process.on('SIGTERM', async () => {
    console.log('[Worker] Received SIGTERM, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Worker] Received SIGINT, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
