import { Global, Module } from '@nestjs/common';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisSubscriptionService, RedisCacheService],
  exports: [RedisSubscriptionService, RedisCacheService],
})
export class RedisModule {}
