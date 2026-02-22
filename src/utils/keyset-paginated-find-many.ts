import { DrizzleService } from '@/lib/drizzle/drizzle.service';
import { PaginationArgs } from '@/utils/args/pagination.args';
import { SearchArgs } from '@/utils/args/search.args';
import { OrderDirection } from './args/ordenation.args';
import { PageInfo } from './models/page-info.model';
import { Edge, Connection } from './models/connection.model';
import { sql, SQL } from 'drizzle-orm';

/**
 * Cursor data structure for keyset pagination.
 * Contains the ID and sort field value for stable pagination.
 */
export interface CursorData {
  id: string;
  sortValue: string | number | null;
}

/**
 * Encodes cursor data to a base64 string.
 */
export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decodes a base64 cursor string to cursor data.
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as CursorData;
  } catch {
    return null;
  }
}

export interface KeysetPaginationConfig<TDatabase> {
  tableName: string;
  paginationArgs: PaginationArgs;
  searchArgs: SearchArgs;
  searchByFields: (keyof TDatabase)[];
  orderBy: keyof TDatabase;
  orderDirection: OrderDirection;
  selectFields: (keyof TDatabase)[];
}

/**
 * Keyset-based (ID-based) cursor pagination.
 *
 * Benefits over offset-based:
 * - O(1) performance regardless of page depth (uses index)
 * - Stable pagination (items don't shift when data changes)
 * - Opaque cursors (harder to manipulate)
 *
 * Requirements:
 * - The orderBy field must be indexed
 * - Cursors contain both ID and sort value for stability
 */
export class KeysetPaginatedFindMany<TDatabase extends { id: string }> {
  private pageInfo: PageInfo = {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  };

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly config: KeysetPaginationConfig<TDatabase>,
  ) {
    const { after } = this.config.paginationArgs;
    this.pageInfo.hasPreviousPage = !!after;
  }

  /**
   * Decodes the after/before cursor to get the cursor data.
   */
  private getCursorData(): CursorData | null {
    const { after, before } = this.config.paginationArgs;
    const cursorString = after || before;
    return cursorString ? decodeCursor(cursorString) : null;
  }

  /**
   * Builds the WHERE clause for keyset pagination.
   */
  private buildWhereClause(cursorData: CursorData | null): SQL | null {
    const { orderBy, orderDirection } = this.config;
    const { last } = this.config.paginationArgs;
    const { search } = this.config.searchArgs;

    const conditions: SQL[] = [];

    // Search conditions
    if (search) {
      const searchConditions = this.config.searchByFields.map(
        (field) =>
          sql`unaccent(${sql.raw(`"${String(field)}"`)}::text) ILIKE unaccent(${`%${search}%`})`,
      );
      conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
    }

    // Keyset pagination condition
    if (cursorData) {
      const sortField = sql.raw(`"${String(orderBy)}"`);
      const isAsc = orderDirection === OrderDirection.Asc;
      const isForward = !last;

      // For forward pagination (first/after): get items AFTER cursor
      // For backward pagination (last/before): get items BEFORE cursor
      const operator =
        (isAsc && isForward) || (!isAsc && !isForward) ? '>' : '<';
      const opSql = sql.raw(operator);

      if (cursorData.sortValue !== null) {
        conditions.push(
          sql`(
            ${sortField} ${opSql} ${cursorData.sortValue}
            OR (${sortField} = ${cursorData.sortValue} AND "id" ${opSql} ${cursorData.id})
          )`,
        );
      } else {
        conditions.push(sql`"id" ${opSql} ${cursorData.id}`);
      }
    }

    return conditions.length > 0
      ? sql` WHERE ${sql.join(conditions, sql` AND `)} AND "deletedAt" IS NULL`
      : sql` WHERE "deletedAt" IS NULL`;
  }

  /**
   * Builds the ORDER BY clause.
   */
  private buildOrderByClause(): SQL {
    const { orderBy, orderDirection } = this.config;
    const { last } = this.config.paginationArgs;

    const sortField = sql.raw(`"${String(orderBy)}"`);
    const isAsc = orderDirection === OrderDirection.Asc;

    // Reverse order for backward pagination (last/before)
    const direction = last ? (isAsc ? 'DESC' : 'ASC') : isAsc ? 'ASC' : 'DESC';
    const directionSql = sql.raw(direction);

    return sql` ORDER BY ${sortField} ${directionSql}, "id" ${directionSql}`;
  }

  /**
   * Fetches the paginated items.
   */
  async getItems(): Promise<TDatabase[]> {
    const { first, last } = this.config.paginationArgs;
    const limit = first || last || 20;
    const cursorData = this.getCursorData();

    const selectClause = sql.raw(
      this.config.selectFields.map((f) => `"${String(f)}"`).join(', '),
    );

    const whereClause = this.buildWhereClause(cursorData);
    const orderByClause = this.buildOrderByClause();
    const tableNameSql = sql.raw(`"${this.config.tableName}"`);

    const query = sql`SELECT ${selectClause} FROM ${tableNameSql}${whereClause || sql``}${orderByClause} LIMIT ${limit + 1}`;

    const result = await this.drizzleService.db.execute(query);
    const items = result.rows as unknown as TDatabase[];

    // Fetch one extra to determine hasNextPage/hasPreviousPage
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    // Reverse items for backward pagination
    if (last) {
      items.reverse();
    }

    // Set hasNextPage/hasPreviousPage
    if (last) {
      this.pageInfo.hasPreviousPage = hasMore;
    } else {
      this.pageInfo.hasNextPage = hasMore;
    }

    return items;
  }

  /**
   * Builds edges with cursors from items.
   */
  buildEdges(items: TDatabase[]): Edge<TDatabase>[] {
    const { orderBy } = this.config;

    return items.map((item) => ({
      cursor: encodeCursor({
        id: item.id,
        sortValue: item[orderBy] as string | number | null,
      }),
      node: item,
    }));
  }

  /**
   * Main method to execute paginated query.
   */
  async findMany(): Promise<Connection<TDatabase>> {
    const { after, before } = this.config.paginationArgs;

    const items = await this.getItems();

    if (items.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: !!after || !!before,
          startCursor: null,
          endCursor: null,
        },
      };
    }

    const edges = this.buildEdges(items);

    this.pageInfo.startCursor = edges[0].cursor;
    this.pageInfo.endCursor = edges[edges.length - 1].cursor;

    return {
      edges,
      pageInfo: this.pageInfo,
    };
  }
}
