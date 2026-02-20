import { Injectable } from '@nestjs/common';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { DomainEventPublisherPort } from '@/shared/application/ports/domain-event-publisher.port';

@Injectable()
export class RedisDomainEventPublisherAdapter
  implements DomainEventPublisherPort
{
  constructor(
    private readonly redisSubscriptionService: RedisSubscriptionService,
  ) {}

  async publishUserCreated(payload: {
    email: string;
    name: string;
    role: string;
  }): Promise<void> {
    await this.redisSubscriptionService.publish('userAdded', {
      userAdded: payload,
    });
  }
}
