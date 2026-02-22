import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_CONNECTION_TOKEN = 'DB_CONNECTION';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  public db: NodePgDatabase<typeof schema>;
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url =
      this.configService.get('NODE_ENV') === 'test'
        ? this.configService.get('DATABASE_TEST_URL')
        : this.configService.get('DATABASE_URL');

    this.pool = new Pool({
      connectionString: url,
    });

    this.db = drizzle(this.pool, { schema });
    
    // Ensure postgres unaccent extension is installed for searches
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS "unaccent";');
  }

  async onModuleDestroy() {
    if (this.configService.get('NODE_ENV') === 'test') {
      console.log(
        'NODE_ENV set to TEST mode - Dropping schema tables omitted for brevity in mock',
      );
    }

    if (this.pool) {
      await this.pool.end();
    }
  }

  /**
   * Execute multiple operations in a transaction.
   * If any operation fails, all operations are rolled back.
   */
  async executeTransaction<T>(
    fn: (
      tx: Parameters<Parameters<typeof this.db.transaction>[0]>[0],
    ) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(fn);
  }
}
