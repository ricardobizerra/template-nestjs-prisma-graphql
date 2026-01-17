import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public prismaClient: PrismaClient;

  constructor(readonly configService: ConfigService) {
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url:
            configService.get('NODE_ENV') === 'test'
              ? configService.get('DATABASE_TEST_URL')
              : configService.get('DATABASE_URL'),
        },
      },
    });
  }

  onModuleInit() {
    return this.$connect();
  }

  async onModuleDestroy() {
    if (this.configService.get('NODE_ENV') === 'test') {
      console.log('NODE_ENV set to TEST mode');
      const tables = await this.$queryRaw<{ table_name: string }[]>(
        Prisma.sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
      );

      if (tables.length > 0) {
        console.log('Dropping tables');
        // await this.$executeRaw`DROP TABLE IF EXISTS ${Prisma.join(
        //   tables.map((t) => `"${t.table_name}"`),
        //   ', ',
        // )} CASCADE`;
      }
    }

    throw this.$disconnect();
  }
}
