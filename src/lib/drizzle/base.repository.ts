import { Injectable } from '@nestjs/common';
import { PgTable } from 'drizzle-orm/pg-core';
import { DrizzleService } from './drizzle.service';
import { and, eq, isNull, SQL } from 'drizzle-orm';

/**
 * Base repository pattern abstract class.
 * Provides generic data access methods using Drizzle ORM
 * and automatically applies centralized soft deleting filters
 * for tables containing `deletedAt`.
 */
@Injectable()
export abstract class BaseRepository<TTable extends PgTable<any>> {
  constructor(
    protected readonly drizzleService: DrizzleService,
    protected readonly table: TTable,
  ) {}

  /**
   * Retrieves many records matching an optional `where` filter.
   * Auto-filters `deletedAt IS NULL`.
   */
  async findMany(where?: SQL) {
    let condition = where;

    if ('deletedAt' in this.table) {
      const softDeleteCondition = isNull((this.table as any).deletedAt);
      condition = condition
        ? and(condition, softDeleteCondition)
        : softDeleteCondition;
    }

    return this.drizzleService.db
      .select()
      .from(this.table as any)
      .where(condition);
  }

  /**
   * Retrieves a single record by its UUID.
   * Auto-filters `deletedAt IS NULL`.
   */
  async findUnique(id: string) {
    if (!('id' in this.table)) {
      throw new Error(`Table does not have an 'id' column`);
    }

    let condition: SQL | undefined = eq((this.table as any).id, id);

    if ('deletedAt' in this.table) {
      condition = and(condition, isNull((this.table as any).deletedAt));
    }

    const records = await this.drizzleService.db
      .select()
      .from(this.table as any)
      .where(condition)
      .limit(1);
    return records[0] || null;
  }

  /**
   * Soft-deletes a record by UUID.
   * Falls back to hard-delete if `deletedAt` column does not exist on table.
   */
  async softDelete(id: string) {
    if (!('id' in this.table)) {
      throw new Error(`Table does not have an 'id' column`);
    }

    if ('deletedAt' in this.table) {
      return this.drizzleService.db
        .update(this.table as any)
        .set({ deletedAt: new Date() } as any)
        .where(eq((this.table as any).id, id))
        .returning();
    }

    // Default to hard delete if table doesn't support soft delete
    return this.hardDelete(id);
  }

  /**
   * Restores a soft-deleted record by its UUID.
   */
  async restore(id: string) {
    if (!('id' in this.table)) {
      throw new Error(`Table does not have an 'id' column`);
    }

    if ('deletedAt' in this.table) {
      return this.drizzleService.db
        .update(this.table as any)
        .set({ deletedAt: null } as any)
        .where(eq((this.table as any).id, id))
        .returning();
    }
  }

  /**
   * Permanently deletes a record bypassing soft delete constraints.
   */
  async hardDelete(id: string) {
    if (!('id' in this.table)) {
      throw new Error(`Table does not have an 'id' column`);
    }

    return this.drizzleService.db
      .delete(this.table as any)
      .where(eq((this.table as any).id, id))
      .returning();
  }

  /**
   * Retrieves all records that have been soft deleted.
   */
  async findSoftDeleted() {
    if (!('deletedAt' in this.table)) {
      return [];
    }

    // Not entirely safe from SQL injections if field name changes but isNull is an operator
    // Just find anything where deletedAt is NOT null
    // wait Drizzle has isNotNull
    const { isNotNull } = await import('drizzle-orm');
    const condition = isNotNull((this.table as any).deletedAt);

    return this.drizzleService.db
      .select()
      .from(this.table as any)
      .where(condition);
  }
}
