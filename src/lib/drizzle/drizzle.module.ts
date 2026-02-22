import { Global, Module } from '@nestjs/common';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';

@Global()
@Module({
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DrizzleModule {}
