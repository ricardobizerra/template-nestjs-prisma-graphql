import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env, envSchema } from '@/env';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { HealthModule } from '@/health/health.module';
import { UserModule } from '@/user/user.module';
import { RedisModule } from '@/lib/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join(process.cwd(), 'src/lib/graphql/schema.gql'),
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      context: ({ req }) => ({ request: req }),
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Env, true>) => ({
        store: await redisStore({
          url: configService.get('REDIS_URL'),
        }),
      }),
      isGlobal: true,
    }),
    HealthModule,
    PrismaModule,
    UserModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
