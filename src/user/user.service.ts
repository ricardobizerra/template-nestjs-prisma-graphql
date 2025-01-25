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
      ? Buffer.from(paginationArgs.after, 'base64').toString('utf-8')
      : paginationArgs.before
        ? Buffer.from(paginationArgs.before, 'base64').toString('utf-8')
        : undefined;

    const { orderBy, orderDirection = OrderDirection.Asc } = ordenationArgs;

    const users = await this.prismaService.$queryRaw<User[]>(
      Prisma.sql`
        SELECT ${Prisma.join(
          queriedFields.map((field) => Prisma.raw(field)),
          ', ',
        )}
        FROM "User"
        ${
          paginationArgs.after
            ? Prisma.sql`WHERE id > ${unbufferedCursor}`
            : paginationArgs.before
              ? Prisma.sql`WHERE id < ${unbufferedCursor}`
              : Prisma.empty
        }
        ${
          !!searchArgs.search
            ? Prisma.sql`${
                paginationArgs.after || paginationArgs.before
                  ? Prisma.sql`AND`
                  : Prisma.sql`WHERE`
              } (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
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
            ? paginationArgs.last
            : paginationArgs.first
              ? paginationArgs.first
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

    const edges = users.map((user) => ({
      cursor: Buffer.from(user.id).toString('base64'),
      node: user,
    }));

    const startCursor = Buffer.from(users[0].id).toString('base64');
    const endCursor = Buffer.from(users[users.length - 1].id).toString(
      'base64',
    );

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

    const extraItem = await this.prismaService.$queryRaw<
      Array<Pick<User, 'id'>>
    >(
      Prisma.sql`
        SELECT id
        FROM "User"
        ${
          paginationArgs.after
            ? Prisma.sql`WHERE id > ${unbufferedCursor}`
            : paginationArgs.before
              ? Prisma.sql`WHERE id < ${unbufferedCursor}`
              : Prisma.empty
        }
        ${
          !!searchArgs.search
            ? Prisma.sql`${
                paginationArgs.after || paginationArgs.before
                  ? Prisma.sql`AND`
                  : Prisma.sql`WHERE`
              } (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})`
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
        ${
          paginationArgs.last
            ? Prisma.sql`OFFSET ${paginationArgs.last}`
            : paginationArgs.first
              ? Prisma.sql`OFFSET ${paginationArgs.first}`
              : Prisma.empty
        }
      `,
    );

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
