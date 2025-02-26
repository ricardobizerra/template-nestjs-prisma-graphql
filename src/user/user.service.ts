import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserCreateInput } from '@/lib/graphql/prisma-client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { selectObject } from '@/utils/select-object';
import { genSalt, hash } from 'bcryptjs';
import { PaginationArgs } from '@/utils/args/pagination.args';
import { SearchArgs } from '@/utils/args/search.args';
import { OrdenationUserArgs } from './models/user.model';
import { OrderDirection } from '@/utils/args/ordenation.args';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisSubscriptionService: RedisSubscriptionService,
  ) {}

  async findMany({
    queriedFields,
    paginationArgs,
    searchArgs,
    ordenationArgs,
  }: {
    queriedFields: string[];
    paginationArgs: PaginationArgs;
    searchArgs: SearchArgs;
    ordenationArgs: OrdenationUserArgs;
  }) {
    const { after, before, first, last } = paginationArgs;
    const { orderBy, orderDirection = OrderDirection.Asc } = ordenationArgs;

    const unbufferedCursor = after
      ? Number(Buffer.from(after, 'base64').toString('utf-8'))
      : before
        ? Number(Buffer.from(before, 'base64').toString('utf-8'))
        : 0;

    const usersLengthQuery = last
      ? await this.prismaService.$queryRaw(
          Prisma.sql`SELECT COUNT(*) FROM "User"${
            !!searchArgs.search
              ? Prisma.sql` WHERE (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
              : Prisma.empty
          }`,
        )
      : undefined;

    const usersLength = !!usersLengthQuery
      ? Number(usersLengthQuery?.[0].count)
      : undefined;

    const users = await this.prismaService.$queryRaw<User[]>(
      Prisma.sql`SELECT ${Prisma.join(
        queriedFields.map((field) => Prisma.raw(field)),
        ', ',
      )} FROM "User"${
        !!searchArgs.search
          ? Prisma.sql` WHERE (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
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
      } LIMIT ${
        last
          ? unbufferedCursor
            ? Prisma.raw(`${last}`)
            : usersLength % last === 0
              ? Prisma.raw(`${last}`)
              : Prisma.raw(`${usersLength % last}`)
          : first
            ? Prisma.raw(`${first}`)
            : Prisma.empty
      }${
        unbufferedCursor
          ? last
            ? Prisma.sql` OFFSET ${Prisma.raw(`${usersLength - unbufferedCursor + 1}`)}`
            : Prisma.sql` OFFSET ${Prisma.raw(`${unbufferedCursor}`)}`
          : last
            ? Prisma.sql` OFFSET 0`
            : Prisma.empty
      }`,
    );

    if (last) {
      users.reverse();
    }

    if (users.length === 0) {
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

    const edges = users.map((user, index) => {
      const cursorIndex =
        index +
        1 +
        (last
          ? unbufferedCursor
            ? unbufferedCursor - last - 1
            : usersLength - users.length
          : unbufferedCursor || 0);

      const bufferedCursor = Buffer.from(cursorIndex.toString())
        .toString('base64')
        .split('=')[0];

      return {
        cursor: bufferedCursor,
        node: user,
      };
    });

    const startCursor = edges[0].cursor;
    const endCursor = edges[edges.length - 1].cursor;

    if (!first && !last) {
      return {
        edges,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: !!after,
          startCursor,
          endCursor,
        },
      };
    }

    const extraItem = !(
      last && Number(Buffer.from(startCursor, 'base64').toString('utf-8')) <= 1
    )
      ? await this.prismaService.$queryRaw<Array<Pick<User, 'id'>>>(
          Prisma.sql`SELECT id FROM "User"${
            !!searchArgs.search
              ? Prisma.sql` WHERE (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
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

    const hasNextPage = last ? !!before : !!extraItem?.length;

    const hasPreviousPage = last ? !!extraItem?.length : !!after;

    const pageInfo = {
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
    };

    return {
      edges,
      pageInfo,
    };
  }

  async findOne(id: string) {
    return this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(data: UserCreateInput) {
    const salt = await genSalt(10);
    const hashedPassword = await hash(data.password, salt);

    const createdUser = await this.prismaService.user.create({
      data: { ...data, password: hashedPassword },
    });

    if (!!createdUser) {
      this.redisSubscriptionService.publish('userAdded', { userAdded: data });
    }

    return createdUser;
  }

  async update(id: string, data: UserCreateInput) {
    return this.prismaService.user.update({
      where: {
        id,
      },
      data,
    });
  }
}
