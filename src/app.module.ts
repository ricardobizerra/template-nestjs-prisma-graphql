import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from '@/env';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { HealthModule } from '@/health/health.module';
import { UserModule } from '@/user/user.module';
import { RedisModule } from '@/lib/redis/redis.module';
import { AuthModule } from './auth/auth.module';

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
