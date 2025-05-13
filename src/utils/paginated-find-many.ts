import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { PaginationArgs } from '@/utils/args/pagination.args';
import { SearchArgs } from '@/utils/args/search.args';
import { Prisma } from '@prisma/client';
import { OrderDirection } from './args/ordenation.args';
import { selectObject, SelectObjectParams } from './select-object';
import { PageInfo } from './models/page-info.model';

export class PaginatedFindMany<
  TDatabase extends Record<string, any>,
  TModel extends Partial<TDatabase>,
> {
  private pageInfo: PageInfo;
  private length: number | undefined;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisSubscriptionService: RedisSubscriptionService,
    private readonly args: {
      selectObjectArgs: SelectObjectParams<TDatabase, TModel>;
      paginationArgs: PaginationArgs;
      searchArgs: SearchArgs;
      searchByFields: (keyof TDatabase)[];
      ordenationArgs: any;
      tableName: string;
    },
  ) {
    const { after } = this.args.paginationArgs;

    this.pageInfo = {
      hasNextPage: false,
      hasPreviousPage: !!after,
      startCursor: null,
      endCursor: null,
    };

    this.length = undefined;
  }

  public getUnbufferedCursor() {
    const { after, before } = this.args.paginationArgs;

    const unbufferedCursor = after
      ? Number(Buffer.from(after, 'base64').toString('utf-8'))
      : before
        ? Number(Buffer.from(before, 'base64').toString('utf-8'))
        : 0;

    return unbufferedCursor;
  }

  public async setLength() {
    const { last } = this.args.paginationArgs;

    if (!last) return undefined;

    const query = await this.prismaService.$queryRaw(
      Prisma.sql`SELECT COUNT(*) FROM ${Prisma.raw(`"${this.args.tableName}"`)}${
        !!this.args.searchArgs.search
          ? Prisma.sql` WHERE ${Prisma.join(
              this.args.searchByFields.map(
                (field) =>
                  Prisma.sql`unaccent(${Prisma.raw(field?.toString())}) ILIKE ${`%${this.args.searchArgs.search}%`}`,
              ),
              ' OR ',
            )}`
          : Prisma.empty
      }`,
    );

    this.length = Number(query?.[0].count);
  }

  public getLength() {
    return this.length;
  }

  private setPageInfo(args: Partial<PageInfo>) {
    this.pageInfo = {
      ...this.pageInfo,
      ...args,
    };
  }

  public getPageInfo() {
    return this.pageInfo;
  }

  public async getExtraItem() {
    const { first, last } = this.args.paginationArgs;
    const { orderBy, orderDirection = OrderDirection.Asc } =
      this.args.ordenationArgs;

    const unbufferedCursor = this.getUnbufferedCursor();

    const { startCursor, endCursor } = this.getPageInfo();

    return !(
      last && Number(Buffer.from(startCursor, 'base64').toString('utf-8')) <= 1
    )
      ? await this.prismaService.$queryRaw<Array<Pick<TDatabase, 'id'>>>(
          Prisma.sql`SELECT id FROM ${Prisma.raw(`"${this.args.tableName}"`)}${
            !!this.args.searchArgs.search
              ? Prisma.sql` WHERE ${Prisma.join(
                  this.args.searchByFields.map(
                    (field) =>
                      Prisma.sql`unaccent(${Prisma.raw(field?.toString())}) ILIKE ${`%${this.args.searchArgs.search}%`}`,
                  ),
                  ' OR ',
                )}`
              : Prisma.empty
          }${
            orderBy
              ? Prisma.sql` ORDER BY ${Prisma.raw(orderBy)} ${
                  last
                    ? orderDirection === OrderDirection.Asc
                      ? Prisma.sql`DESC`
                      : Prisma.sql`ASC`
                    : orderDirection === OrderDirection.Asc
                      ? Prisma.sql`ASC`
                      : Prisma.sql`DESC`
                }`
              : Prisma.empty
          } LIMIT 1 OFFSET ${
            last
              ? Prisma.sql`${Prisma.raw(`${Number(Buffer.from(startCursor, 'base64').toString('utf-8')) - 2}`)}`
              : first
                ? Prisma.sql`${Prisma.raw(`${Number(Buffer.from(endCursor, 'base64').toString('utf-8'))}`)}`
                : Prisma.sql`${Prisma.raw(`${unbufferedCursor}`)}`
          }`,
        )
      : [];
  }

  public async getItems() {
    const { first, last } = this.args.paginationArgs;
    const { orderBy, orderDirection = OrderDirection.Asc } =
      this.args.ordenationArgs;

    const unbufferedCursor = this.getUnbufferedCursor();

    await this.setLength();

    const items = await this.prismaService.$queryRaw<TDatabase[]>(
      Prisma.sql`SELECT ${Prisma.join(
        Object.keys(
          selectObject<TDatabase, TModel>(...this.args.selectObjectArgs),
        ).map((field) => Prisma.raw(field)),
        ', ',
      )} FROM ${Prisma.raw(`"${this.args.tableName}"`)}${
        !!this.args.searchArgs.search
          ? Prisma.sql` WHERE ${Prisma.join(
              this.args.searchByFields.map(
                (field) =>
                  Prisma.sql`unaccent(${Prisma.raw(field?.toString())}) ILIKE ${`%${this.args.searchArgs.search}%`}`,
              ),
              ' OR ',
            )}`
          : Prisma.empty
      }${
        orderBy
          ? Prisma.sql` ORDER BY ${Prisma.raw(orderBy)} ${
              last
                ? orderDirection === OrderDirection.Asc
                  ? Prisma.sql`DESC`
                  : Prisma.sql`ASC`
                : orderDirection === OrderDirection.Asc
                  ? Prisma.sql`ASC`
                  : Prisma.sql`DESC`
            }`
          : Prisma.empty
      }${
        last
          ? unbufferedCursor
            ? Prisma.raw(` LIMIT ${last}`)
            : length % last === 0
              ? Prisma.raw(` LIMIT ${last}`)
              : Prisma.raw(` LIMIT ${length % last}`)
          : first
            ? Prisma.raw(` LIMIT ${first}`)
            : Prisma.empty
      }${
        unbufferedCursor
          ? last
            ? Prisma.sql` OFFSET ${Prisma.raw(`${length - unbufferedCursor + 1}`)}`
            : Prisma.sql` OFFSET ${Prisma.raw(`${unbufferedCursor}`)}`
          : last
            ? Prisma.sql` OFFSET 0`
            : Prisma.empty
      }`,
    );

    if (last) {
      items.reverse();
    }

    return items;
  }

  public async buildEdges(items: TDatabase[]) {
    const { first, last, before, after } = this.args.paginationArgs;
    const unbufferedCursor = this.getUnbufferedCursor();
    const length = this.getLength();

    const edges = items.map((item, index) => {
      const cursorIndex =
        index +
        1 +
        (last
          ? unbufferedCursor
            ? unbufferedCursor - last - 1
            : length - items.length
          : unbufferedCursor || 0);

      const bufferedCursor = Buffer.from(cursorIndex.toString())
        .toString('base64')
        .split('=')[0];

      return {
        cursor: bufferedCursor,
        node: item,
      };
    });

    this.setPageInfo({
      startCursor: edges[0].cursor,
      endCursor: edges[edges.length - 1].cursor,
    });

    if (!first && !last) {
      return {
        edges,
        pageInfo: this.getPageInfo(),
      };
    }

    const extraItem = await this.getExtraItem();

    const hasNextPage = last ? !!before : !!extraItem?.length;

    const hasPreviousPage = last ? !!extraItem?.length : !!after;

    this.setPageInfo({
      hasNextPage,
      hasPreviousPage,
    });

    return edges;
  }

  public async findMany() {
    const { after, before, first, last } = this.args.paginationArgs;

    const items = await this.getItems();

    if (items.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: !!after,
          startCursor: null,
          endCursor: null,
        },
      };
    }

    const edges = await this.buildEdges(items);

    return {
      edges,
      pageInfo: this.getPageInfo(),
    };
  }
}
