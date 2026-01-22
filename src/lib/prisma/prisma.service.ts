import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(readonly configService: ConfigService) {
    super({
      log:
        configService.get('NODE_ENV') === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
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

    return this.$disconnect();
  }

  /**
   * Execute multiple operations in a transaction.
   * If any operation fails, all operations are rolled back.
   *
   * @example
   * // Interactive transaction (recommended for complex operations)
   * await prisma.executeTransaction(async (tx) => {
   *   const user = await tx.user.create({ data: { ... } });
   *   await tx.profile.create({ data: { userId: user.id, ... } });
   *   return user;
   * });
   *
   * @example
   * // With custom options
   * await prisma.executeTransaction(
   *   async (tx) => { ... },
   *   { timeout: 10000, isolationLevel: 'Serializable' }
   * );
   */
  async executeTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.$transaction(fn, {
      maxWait: options?.maxWait ?? 5000,
      timeout: options?.timeout ?? 10000,
      isolationLevel: options?.isolationLevel,
    });
  }
}
