import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/lib/drizzle/base.repository';
import * as schema from '@/lib/drizzle/schema';
import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import { eq, or, SQL } from 'drizzle-orm';

@Injectable()
export class UserRepository extends BaseRepository<typeof schema.users> {
  constructor(drizzleService: DrizzleService) {
    super(drizzleService, schema.users);
  }

  /**
   * Extends findUnique to support lookups by either email or id
   */
  async findByEmail(email: string) {
    const { isNull, and } = await import('drizzle-orm');
    let condition: SQL = eq(this.table.email, email);

    if ('deletedAt' in this.table) {
      condition = and(condition, isNull((this.table as any).deletedAt)) as SQL;
    }

    const records = await this.drizzleService.db
      .select()
      .from(this.table as any)
      .where(condition)
      .limit(1);
    return records[0] || null;
  }
}
