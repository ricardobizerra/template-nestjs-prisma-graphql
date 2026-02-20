import { Module } from '@nestjs/common';
import { QueueModule } from '@/lib/queue/queue.module';
import { RedisModule } from '@/lib/redis/redis.module';
import { MAIL_QUEUE_PORT } from '@/shared/application/ports/mail-queue.port';
import { BullMqMailQueueAdapter } from '@/infrastructure/messaging/adapters/mail-queue.adapter';
import { DOMAIN_EVENT_PUBLISHER_PORT } from '@/shared/application/ports/domain-event-publisher.port';
import { RedisDomainEventPublisherAdapter } from '@/infrastructure/messaging/adapters/domain-event-publisher.adapter';

@Module({
  imports: [QueueModule, RedisModule],
  providers: [
    {
      provide: MAIL_QUEUE_PORT,
      useClass: BullMqMailQueueAdapter,
    },
    {
      provide: DOMAIN_EVENT_PUBLISHER_PORT,
      useClass: RedisDomainEventPublisherAdapter,
    },
  ],
  exports: [MAIL_QUEUE_PORT, DOMAIN_EVENT_PUBLISHER_PORT],
})
export class MessagingModule {}
