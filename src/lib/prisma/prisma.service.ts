import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  configureSoftDelete,
  executeHardDelete,
  restoreSoftDeleted,
  findSoftDeleted,
  SoftDeleteModel,
} from './soft-delete.extension';

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

    // Configure soft delete middleware
    configureSoftDelete(this);
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
      }
    }

    return this.$disconnect();
  }

  /**
   * Execute multiple operations in a transaction.
   * If any operation fails, all operations are rolled back.
   *
   * @example
   * await prisma.executeTransaction(async (tx) => {
   *   const user = await tx.user.create({ data: { ... } });
   *   await tx.profile.create({ data: { userId: user.id, ... } });
   *   return user;
   * });
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

  /**
   * Permanently delete a record (bypasses soft delete middleware).
   *
   * @example
   * await prisma.hardDelete('User', { id: 'user-123' });
   */
  async hardDelete(
    model: SoftDeleteModel,
    where: { id: string },
  ): Promise<void> {
    return executeHardDelete(this, model, where);
  }

  /**
   * Restore a soft-deleted record.
   *
   * @example
   * await prisma.restore('User', 'user-123');
   */
  async restore(model: SoftDeleteModel, id: string): Promise<void> {
    return restoreSoftDeleted(this, model, id);
  }

  /**
   * Find all soft-deleted records for a model.
   *
   * @example
   * const deletedUsers = await prisma.findDeleted<User>('User');
   */
  async findDeleted<T>(model: SoftDeleteModel): Promise<T[]> {
    return findSoftDeleted<T>(this, model);
  }
}
