import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService extends RedisPubSub implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    const options: RedisOptions = {
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB'),
    };

    super({
      publisher: new Redis(options),
      subscriber: new Redis(options),
    });
  }

  async onModuleInit() {
    await this.getSubscriber().subscribe('EVENTS');
  }
}
