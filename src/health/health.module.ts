import { Module } from '@nestjs/common';
import { HealthResolver } from '@/health/health.resolver';

@Module({
  providers: [HealthResolver],
})
export class HealthModule {}
