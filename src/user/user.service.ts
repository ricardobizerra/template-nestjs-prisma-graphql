import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserCreateInput } from '@/lib/graphql/prisma-client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisService } from '@/lib/redis/redis.service';
import { selectObject } from '@/utils/select-object';
import { genSalt, hash } from 'bcryptjs';
import { PaginationArgs } from '@/utils/args/pagination.args';
import { SearchArgs } from '@/utils/args/search.args';

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
  }: {
    queriedFields: string[];
    paginationArgs: PaginationArgs;
    searchArgs: SearchArgs;
  }) {
    const unbufferedCursor = paginationArgs.after
      ? Buffer.from(paginationArgs.after, 'base64').toString('utf-8')
      : undefined;

    const users = await this.prismaService.$queryRaw<User[]>(
      Prisma.sql`
        SELECT ${Prisma.join(
          queriedFields.map((field) => Prisma.raw(field)),
          ', ',
        )}
        FROM "User"
        ${paginationArgs.after ? Prisma.sql`WHERE id >= ${unbufferedCursor}` : Prisma.empty}
        ${!!searchArgs.search ? Prisma.sql`${paginationArgs.after ? Prisma.sql`AND` : Prisma.sql`WHERE`} (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})` : Prisma.empty}
        ORDER BY id ASC
        ${paginationArgs.first ? Prisma.sql`LIMIT ${paginationArgs.first}` : Prisma.empty}
        ${paginationArgs.after ? Prisma.sql`OFFSET ${paginationArgs.after ? 1 : 0}` : Prisma.empty}
      `,
    );

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

    if (!paginationArgs.first) {
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
        ${paginationArgs.after ? Prisma.sql`WHERE id > ${unbufferedCursor}` : Prisma.empty}
        ${!!searchArgs.search ? Prisma.sql`${paginationArgs.after ? Prisma.sql`AND` : Prisma.sql`WHERE`} (unaccent(name) ILIKE ${`%${searchArgs.search}%`} OR unaccent(email) ILIKE ${`%${searchArgs.search}%`})` : Prisma.empty}
        ORDER BY id ASC
        LIMIT 1
        ${paginationArgs.after ? Prisma.sql`OFFSET ${paginationArgs.after ? paginationArgs.first + 1 : paginationArgs.first}` : Prisma.empty}
      `,
    );

    const hasNextPage = !!extraItem?.length;
    const hasPreviousPage = !!paginationArgs.after;

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
