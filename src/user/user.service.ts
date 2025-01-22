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
    const select = selectObject<User>(queriedFields);

    const users = await this.prismaService.user.findMany({
      select,
      take: paginationArgs.first,
      cursor: paginationArgs.after
        ? {
            id: Buffer.from(paginationArgs.after, 'base64').toString(),
          }
        : undefined,
      skip: paginationArgs.after ? 1 : 0,
      ...(!!searchArgs.search && {
        where: {
          OR: [
            {
              name: {
                contains: searchArgs.search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: searchArgs.search,
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
    });

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

    const extraItem = await this.prismaService.user.findFirst({
      select: { id: true },
      take: 1,
      skip: paginationArgs.after
        ? paginationArgs.first + 1
        : paginationArgs.first,
      cursor: paginationArgs.after
        ? {
            id: Buffer.from(paginationArgs.after, 'base64').toString(),
          }
        : undefined,
      ...(!!searchArgs.search && {
        where: {
          OR: [
            {
              name: {
                contains: searchArgs.search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: searchArgs.search,
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
    });

    const hasNextPage = !!extraItem && !!extraItem.id;
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
