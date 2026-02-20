import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIG_PORT } from '@/shared/application/ports/config.port';
import { AppConfigAdapter } from '@/infrastructure/config/adapters/config.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CONFIG_PORT,
      useClass: AppConfigAdapter,
    },
  ],
  exports: [CONFIG_PORT],
})
export class ConfigAdaptersModule {}
