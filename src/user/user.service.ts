import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserCreateInput } from '@/lib/graphql/prisma-client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisService } from '@/lib/redis/redis.service';
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
    private readonly redisService: RedisService,
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
    const unbufferedCursor = paginationArgs.after
      ? Number(Buffer.from(paginationArgs.after, 'base64').toString('utf-8'))
      : paginationArgs.before
        ? Number(Buffer.from(paginationArgs.before, 'base64').toString('utf-8'))
        : 0;

    const { orderBy, orderDirection = OrderDirection.Asc } = ordenationArgs;

    const usersLengthQuery = paginationArgs.last
      ? await this.prismaService.$queryRaw(
          Prisma.sql`
        SELECT COUNT(*)
        FROM "User"
        ${
          !!searchArgs.search
            ? Prisma.sql`WHERE (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
            : Prisma.empty
        }
      `,
        )
      : undefined;

    const usersLength = !!usersLengthQuery
      ? Number(usersLengthQuery?.[0].count)
      : undefined;

    const users = await this.prismaService.$queryRaw<User[]>(
      Prisma.sql`
        SELECT ${Prisma.join(
          queriedFields.map((field) => Prisma.raw(field)),
          ', ',
        )}
        FROM "User"
        ${
          !!searchArgs.search
            ? Prisma.sql`WHERE (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
            : Prisma.empty
        }
        ${
          orderBy
            ? Prisma.sql`ORDER BY ${Prisma.raw(orderBy)} ${
                paginationArgs.last
                  ? orderDirection === OrderDirection.Asc
                    ? Prisma.sql`DESC`
                    : Prisma.sql`ASC`
                  : orderDirection === OrderDirection.Asc
                    ? Prisma.sql`ASC`
                    : Prisma.sql`DESC`
              }`
            : Prisma.empty
        }
        LIMIT ${
          paginationArgs.last
            ? unbufferedCursor
              ? paginationArgs.last
              : usersLength % paginationArgs.last === 0
                ? paginationArgs.last
                : usersLength % paginationArgs.last
            : paginationArgs.first
              ? paginationArgs.first
              : Prisma.empty
        }
        ${
          unbufferedCursor
            ? paginationArgs.last
              ? Prisma.sql`OFFSET ${usersLength - unbufferedCursor + 1}`
              : Prisma.sql`OFFSET ${unbufferedCursor}`
            : paginationArgs.last
              ? Prisma.sql`OFFSET 0`
              : Prisma.empty
        }
      `,
    );

    if (paginationArgs.last) {
      users.reverse();
    }

    if (users.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: !!paginationArgs.after,
          startCursor: null,
          endCursor: null,
        },
      };
    }

    const edges = users.map((user, index) => {
      const cursorIndex =
        index +
        1 +
        (paginationArgs.last
          ? unbufferedCursor
            ? unbufferedCursor - paginationArgs.last - 1
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

    if (!paginationArgs.first && !paginationArgs.last) {
      return {
        edges,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: !!paginationArgs.after,
          startCursor,
          endCursor,
        },
      };
    }

    const extraItem = !(
      paginationArgs.last &&
      Number(Buffer.from(startCursor, 'base64').toString('utf-8')) <= 1
    )
      ? await this.prismaService.$queryRaw<Array<Pick<User, 'id'>>>(
          Prisma.sql`
        SELECT id
        FROM "User"
        ${
          !!searchArgs.search
            ? Prisma.sql`WHERE (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
            : Prisma.empty
        }
        ${
          orderBy
            ? Prisma.sql`ORDER BY ${Prisma.raw(orderBy)} ${
                paginationArgs.last
                  ? orderDirection === OrderDirection.Asc
                    ? Prisma.sql`DESC`
                    : Prisma.sql`ASC`
                  : orderDirection === OrderDirection.Asc
                    ? Prisma.sql`ASC`
                    : Prisma.sql`DESC`
              }`
            : Prisma.empty
        }
        LIMIT 1 
        OFFSET ${
          paginationArgs.last
            ? Prisma.sql`${Number(Buffer.from(startCursor, 'base64').toString('utf-8')) - 2}`
            : paginationArgs.first
              ? Prisma.sql`${Number(Buffer.from(endCursor, 'base64').toString('utf-8'))}`
              : Prisma.sql`${unbufferedCursor}`
        }
      `,
        )
      : [];

    const hasNextPage = paginationArgs.last
      ? !!paginationArgs.before
      : !!extraItem?.length;

    const hasPreviousPage = paginationArgs.last
      ? !!extraItem?.length
      : !!paginationArgs.after;

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
      this.redisService.publish('userAdded', { userAdded: data });
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
