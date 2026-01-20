import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from '@/env';
import { QueueModule } from '@/lib/queue/queue.module';
import { EmailProcessor } from '@/lib/queue/processors/email.processor';
import { PrismaModule } from '@/lib/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
    QueueModule,
    PrismaModule,
  ],
  providers: [EmailProcessor],
})
export class WorkerModule {}
