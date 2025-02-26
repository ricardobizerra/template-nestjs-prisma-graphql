import { Global, Module } from '@nestjs/common';
import { RedisService } from '@/lib/redis/redis.service';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisCacheService],
  exports: [RedisService, RedisCacheService],
})
export class RedisModule {}
