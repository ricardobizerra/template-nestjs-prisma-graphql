import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Injectable()
export class RedisService extends RedisPubSub implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {
    super({
      connection: {
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        username: configService.get('REDIS_USERNAME'),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB'),
      },
    });
  }

  async onModuleInit() {
    await this.getSubscriber().subscribe('EVENTS');
  }
}
