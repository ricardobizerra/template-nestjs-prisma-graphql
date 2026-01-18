import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisSubscriptionService implements OnModuleInit {
  private publisher: Redis;
  private subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const options: RedisOptions = {
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB'),
    };

    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);
  }

  async onModuleInit() {
    await this.subscriber.subscribe('EVENTS');
  }

  async publish(channel: string, message: unknown) {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  getSubscriber() {
    return this.subscriber;
  }

  getPublisher() {
    return this.publisher;
  }
}
