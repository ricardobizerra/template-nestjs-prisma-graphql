import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserCreateInput } from '@/lib/graphql/prisma-client';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { RedisSubscriptionService } from '@/lib/redis/redis-subscription.service';
import { selectObject } from '@/utils/select-object';
import { genSalt, hash } from 'bcryptjs';
import { PaginationArgs } from '@/utils/args/pagination.args';
import { SearchArgs } from '@/utils/args/search.args';
import { OrdenationUserArgs, UserModel } from './models/user.model';
import { OrderDirection } from '@/utils/args/ordenation.args';
import { PaginatedFindMany } from '@/utils/paginated-find-many';

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
    queriedFields: (keyof UserModel)[];
    paginationArgs: PaginationArgs;
    searchArgs: SearchArgs;
    ordenationArgs: OrdenationUserArgs;
  }) {
    const paginatedFindMany = new PaginatedFindMany<User, UserModel>(
      this.prismaService,
      this.redisSubscriptionService,
      {
        selectObjectArgs: [queriedFields],
        paginationArgs,
        searchArgs,
        searchByFields: ['email', 'name'],
        ordenationArgs,
        tableName: 'User',
      },
    );

    const items = await paginatedFindMany.getItems();

    if (items.length === 0) {
      return {
        edges: [],
        pageInfo: paginatedFindMany.getPageInfo(),
      };
    }

    const edges = await paginatedFindMany.buildEdges(items);

    return {
      edges,
      pageInfo: paginatedFindMany.getPageInfo(),
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
