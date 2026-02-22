import { PrismaService } from '@/lib/prisma/prisma.service';
import { PaginationArgs } from '@/utils/args/pagination.args';
import { SearchArgs } from '@/utils/args/search.args';
import { Prisma } from '@prisma/client';
import { OrderDirection } from './args/ordenation.args';
import { PageInfo } from './models/page-info.model';
import { Edge, Connection } from './models/connection.model';

/**
 * Cursor data structure for keyset pagination.
 * Contains the ID and sort field value for stable pagination.
 */
export interface CursorData {
  id: string;
  sortValue: string | number | null;
}

/**
 * Encodes cursor data to a base64url string.
 */
export function encodeCursor(data: CursorData): string {
  const payload =
    data.id === data.sortValue ? [data.id] : [data.id, data.sortValue];
  const stringified = JSON.stringify(payload);
  return Buffer.from(stringified).toString('base64url');
}

/**
 * Decodes a base64 or base64url cursor string to cursor data.
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    // Decoding using 'base64' properly handles both standard base64 and base64url
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const [id, sortValue] = parsed;

    return {
      id,
      sortValue: parsed.length === 1 ? id : sortValue,
    };
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
    private readonly prismaService: PrismaService,
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
  private buildWhereClause(cursorData: CursorData | null): Prisma.Sql {
    const { orderBy, orderDirection } = this.config;
    const { last } = this.config.paginationArgs;
    const { search } = this.config.searchArgs;

    const conditions: Prisma.Sql[] = [];

    // Search conditions
    if (search) {
      const searchConditions = this.config.searchByFields.map(
        (field) =>
          Prisma.sql`unaccent(${Prisma.raw(String(field))}) ILIKE unaccent(${`%${search}%`})`,
      );
      conditions.push(Prisma.sql`(${Prisma.join(searchConditions, ' OR ')})`);
    }

    // Keyset pagination condition
    if (cursorData) {
      const sortField = Prisma.raw(String(orderBy));
      const isAsc = orderDirection === OrderDirection.Asc;
      const isForward = !last;

      // For forward pagination (first/after): get items AFTER cursor
      // For backward pagination (last/before): get items BEFORE cursor
      const operator =
        (isAsc && isForward) || (!isAsc && !isForward) ? '>' : '<';

      // Use composite condition: (sortValue, id) > (cursorSortValue, cursorId)
      // This ensures stable ordering even when sortValue has duplicates
      if (cursorData.sortValue !== null) {
        conditions.push(
          Prisma.sql`(
            ${sortField} ${Prisma.raw(operator)} ${cursorData.sortValue}
            OR (${sortField} = ${cursorData.sortValue} AND id ${Prisma.raw(operator)} ${cursorData.id})
          )`,
        );
      } else {
        conditions.push(
          Prisma.sql`id ${Prisma.raw(operator)} ${cursorData.id}`,
        );
      }
    }

    return conditions.length > 0
      ? Prisma.sql` WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
  }

  /**
   * Builds the ORDER BY clause.
   */
  private buildOrderByClause(): Prisma.Sql {
    const { orderBy, orderDirection } = this.config;
    const { last } = this.config.paginationArgs;

    const sortField = Prisma.raw(String(orderBy));
    const isAsc = orderDirection === OrderDirection.Asc;

    // Reverse order for backward pagination (last/before)
    const direction = last ? (isAsc ? 'DESC' : 'ASC') : isAsc ? 'ASC' : 'DESC';

    return Prisma.sql` ORDER BY ${sortField} ${Prisma.raw(direction)}, id ${Prisma.raw(direction)}`;
  }

  /**
   * Fetches the paginated items.
   */
  async getItems(): Promise<TDatabase[]> {
    const { first, last } = this.config.paginationArgs;
    const limit = first || last || 20;
    const cursorData = this.getCursorData();

    const selectClause = Prisma.join(
      this.config.selectFields.map((f) => Prisma.raw(String(f))),
      ', ',
    );

    const whereClause = this.buildWhereClause(cursorData);
    const orderByClause = this.buildOrderByClause();

    const items = await this.prismaService.$queryRaw<TDatabase[]>(
      Prisma.sql`SELECT ${selectClause} FROM ${Prisma.raw(`"${this.config.tableName}"`)}${whereClause}${orderByClause} LIMIT ${limit + 1}`,
    );

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
